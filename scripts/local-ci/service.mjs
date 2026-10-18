#!/usr/bin/env node
import { readFile, mkdir, rm, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig, readOperationalProof } from './config.mjs';
import { Store } from './store.mjs';
import { GitHub } from './github.mjs';
import { Coordinator } from './coordinator.mjs';
import { WorkerClient, Supervisor, listen, rpc } from './worker.mjs';
import { collectEvidence, readTrustedEvidence } from './evidence.mjs';
import { localReadiness } from './readiness.mjs';
import { Attention } from './attention.mjs';
import { parseFactoryConfig } from '../owner-attention.mjs';

export async function startCoordinator(cfg) {
  await mkdir(cfg.stateRoot, { recursive: true, mode: 0o700 });
  const store = new Store(join(cfg.stateRoot, 'queue.sqlite'));
  const github = new GitHub(cfg);
  const worker = new WorkerClient(cfg, github);
  const coordinator = new Coordinator({ store, github, worker, policy: cfg.policy });
  const config = parseFactoryConfig(await readFile(new URL('../../.factory/factory.yaml', import.meta.url), 'utf8'));
  const attention = cfg.notifications ? new Attention({ store, github, owner: 'caraseli02', issue: cfg.attentionIssue }) : null;
  let busy = false;
  let stopping = false;
  let recovered = false;
  let health = { ok: false, error: 'Starting' };
  let delay = 60_000;
  let timer;
  let cycleDone = Promise.resolve();
  const evidenceFor = async (number) => {
    const evidence = await collectEvidence(
      { store, github, worker, policy: cfg.policy, repository: cfg.repository, health, operationalProof: await readOperationalProof(cfg) },
      number,
    );
    const readiness = await localReadiness({
      github,
      pr: evidence.pr,
      evidence,
      repository: cfg.repository,
      policy: cfg.policy,
      config,
      owner: 'caraseli02',
    });
    return { ...evidence, readiness };
  };
  if (attention)
    attention.beforeSend = async (row) => {
      if (!row.key.startsWith('local-ready:')) return true;
      const current = await evidenceFor(row.pr);
      return current.readiness.ready && current.job === row.context;
    };
  // Separate socket, GET only; no source, credentials, logs, retry or mutation API.
  const evidenceServer = await listen(
    cfg.evidenceSocket,
    async (method, path) => {
      if (method === 'GET' && path === '/health') return health;
      const match = path.match(/^\/evidence\/([1-9][0-9]*)$/);
      if (method !== 'GET' || !match) throw new Error('Read-only evidence endpoint');
      return evidenceFor(Number(match[1]));
    },
    0o666,
  );
  const server = await listen(cfg.coordinatorSocket, async (method, path, body) => {
    if (method === 'GET' && path === '/health') return health;
    if (method === 'GET' && path === '/jobs') return store.jobs();
    if (method === 'POST' && path === '/request' && Number.isSafeInteger(body?.pr) && body.pr > 0) {
      const target = join(cfg.stateRoot, `request-${body.pr}`);
      await writeFile(target, '', { mode: 0o600 });
      return { queued: true, pr: body.pr };
    }
    throw new Error('Unknown coordinator request');
  });
  const cycle = async () => {
    if (stopping || busy) return;
    busy = true;
    try {
      if (!recovered) {
        await coordinator.recover();
        recovered = true;
      }
      await coordinator.discover();
      for (const name of await readdir(cfg.stateRoot)) {
        if (!/^request-[1-9][0-9]*$/.test(name)) continue;
        try {
          await coordinator.request(Number(name.slice(8)));
        } catch (error) {
          if (error.status !== 404 && !error.message.includes('requires an open PR')) throw error;
          await writeFile(join(cfg.stateRoot, 'last-request-error.json'), JSON.stringify({ request: name, error: error.message }));
        }
        await rm(join(cfg.stateRoot, name));
      }
      await coordinator.publish();
      health = { ok: true, policy: cfg.policy, observedAt: new Date().toISOString() };
      await writeFile(join(cfg.stateRoot, 'health.json'), JSON.stringify(health), { mode: 0o600 });
      if (attention) {
        const prs = await github.prs();
        const results = [];
        for (const pr of prs) {
          const evidence = await evidenceFor(pr.number);
          results.push({ pr: evidence.pr, evidence, readiness: evidence.readiness });
        }
        await attention.reconcile({ prs, results, config });
        await attention.observeHealth(health, cfg.policy);
      }
      // Polling remains independent while a single worker job is in progress.
      delay = 60_000;
    } catch (error) {
      health = { ok: false, error: error.message, observedAt: new Date().toISOString() };
      await writeFile(join(cfg.stateRoot, 'health.json'), JSON.stringify(health), { mode: 0o600 });
      if (attention) await attention.observeHealth(health, cfg.policy).catch(() => {}); // Intent persists across auth/network loss.
      delay = Math.min(3600_000, Math.max(error.retryMs ?? 0, delay * 2));
    } finally {
      busy = false;
      if (!stopping)
        timer = setTimeout(
          () => {
            cycleDone = cycle();
          },
          delay + Math.floor(Math.random() * 3000),
        );
    }
  };
  let working = false;
  const workerTimer = setInterval(async () => {
    if (stopping || !recovered || working || !health.ok) return;
    working = true;
    try {
      if (store.jobs().some((job) => job.state === 'cleaning')) await coordinator.recover();
      await coordinator.execute();
      await coordinator.publish();
      const removed = store.prune();
      for (const id of removed) await rm(join(cfg.stateRoot, `${id}.source.log`), { force: true });
      // Log ownership/retention is enforced independently in the supervisor.
      if (removed.length) await writeFile(join(cfg.stateRoot, 'last-prune.json'), JSON.stringify(removed));
    } catch (error) {
      health = { ok: false, error: error.message, observedAt: new Date().toISOString() };
    } finally {
      working = false;
    }
  }, 1000);
  cycleDone = cycle();
  return {
    store,
    server,
    async stop() {
      stopping = true;
      clearTimeout(timer);
      clearInterval(workerTimer);
      await cycleDone;
      await new Promise((resolve) => server.close(resolve));
      await new Promise((resolve) => evidenceServer.close(resolve));
      // A running job is recovered through the separate supervisor after restart.
      if (!working) store.close();
    },
  };
}

async function pruneLogs(cfg) {
  const logs = [];
  for (const name of await readdir(cfg.workerRoot)) {
    if (!/^[a-f0-9-]{36}\.(log|control)$/.test(name)) continue;
    const path = join(cfg.workerRoot, name);
    const info = await stat(path);
    logs.push({ path, size: info.size, time: info.mtimeMs });
  }
  logs.sort((a, b) => b.time - a.time);
  let total = 0;
  for (const [index, log] of logs.entries()) {
    total += log.size;
    if (index >= 200 || log.time < Date.now() - 30 * 86400_000 || total > 2 * 1024 ** 3) await rm(log.path);
  }
}

export async function main(args = process.argv.slice(2)) {
  const [mode, configPath, number] = args;
  if (mode === 'evidence') {
    process.stdout.write(`${JSON.stringify(await readTrustedEvidence(Number(number), configPath), null, 2)}\n`);
    return;
  }
  if (mode === 'request' || mode === 'jobs') {
    // Client only; it never reads App credentials or enables the service.
    const cfg = JSON.parse(await readFile(configPath, 'utf8'));
    const result = await rpc(
      cfg.coordinatorSocket,
      mode === 'jobs' ? '/jobs' : '/request',
      mode === 'request' ? { pr: Number(number) } : undefined,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const cfg = await loadConfig(configPath);
  if (mode === 'notify-canary') {
    if (!cfg.notifications || !Number.isSafeInteger(Number(number)) || Number(number) < 1)
      throw new Error('Owner-enabled App notifications and a canary issue number are required');
    const store = new Store(join(cfg.stateRoot, 'queue.sqlite'));
    try {
      const github = new GitHub(cfg);
      const attention = new Attention({ store, github, owner: 'caraseli02', issue: Number(number) });
      const key = attention.enqueue(
        `local-canary:${cfg.policy}`,
        Number(number),
        'Local CI notification canary: confirm that this App-bot mention reached your GitHub inbox before accepting operational proof.',
        cfg.policy,
      );
      await attention.deliver(new Set([key]));
      process.stdout.write(`${JSON.stringify(store.db.prepare('SELECT delivery FROM attention WHERE key=?').get(key))}\n`);
    } finally {
      store.close();
    }
    return;
  }
  if (mode === 'doctor') {
    process.stdout.write(`Pinned trusted release validated; policy ${cfg.policy}. VM boot, isolation and reboot proofs remain separate.\n`);
    return;
  }
  if (mode === 'supervisor') {
    await mkdir(cfg.workerRoot, { recursive: true, mode: 0o700 });
    const supervisor = new Supervisor(cfg);
    await listen(
      cfg.workerSocket,
      async (method, path, body) => {
        if (method === 'GET' && path === '/health') return { busy: supervisor.busy, blocked: supervisor.blocked };
        if (method === 'GET' && path === '/recover') return { cleaned: await supervisor.recover() };
        if (method === 'POST' && path === '/run') {
          const result = await supervisor.run(body);
          await pruneLogs(cfg);
          return result;
        }
        throw new Error('Unknown supervisor request');
      },
      0o660,
    );
    return;
  }
  if (mode !== 'coordinator') throw new Error('Usage: service.mjs coordinator|supervisor|doctor|jobs|request CONFIG [PR]');
  await startCoordinator(cfg);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    process.stderr.write(`Local CI: ${error.message}\n`);
    process.exitCode = 1;
  });
