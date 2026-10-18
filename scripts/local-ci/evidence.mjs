// Trusted read-only evidence. PR code/status strings and caller-supplied JSON are
// never the production transport; readers pin a root-owned operator configuration.
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname } from 'node:path';
import { request } from 'node:http';
import { trustedPath } from './config.mjs';
import { contextKey, digest } from './store.mjs';

export const READER_CONFIG = '/Library/AgentCommerceCI/reader.json';
export const metadataDigest = (pr) => digest([pr.body, pr.labels.map((l) => l.name).sort()]);
export const fresh = (time, now = Date.now()) =>
  Number.isFinite(Date.parse(time)) && now - Date.parse(time) >= 0 && now - Date.parse(time) <= 120_000;

export function assessEvidence(evidence, { repository, pr, policy }, now = Date.now()) {
  const reasons = [];
  if (evidence?.version !== 1 || evidence.repository !== repository || evidence.number !== pr.number)
    reasons.push('missing or wrong repository/PR evidence');
  if (!fresh(evidence?.observedAt, now) || !fresh(evidence?.health?.observedAt, now) || evidence?.health?.ok !== true)
    reasons.push('service health is unavailable or stale');
  if (!/^[a-f0-9]{64}$/.test(policy ?? '') || evidence?.policy !== policy || evidence?.operationalProof !== true)
    reasons.push('policy or owner-approved operational proof is unavailable');
  if (
    evidence?.head !== pr.head?.sha ||
    evidence?.base !== pr.base?.sha ||
    evidence?.baseRef !== pr.base?.ref ||
    evidence?.metadata !== metadataDigest(pr)
  )
    reasons.push('head, current base or metadata changed');
  if (
    evidence?.state !== 'success' ||
    evidence?.result?.state !== 'success' ||
    evidence?.result?.cleaned !== true ||
    !/^[a-f0-9]{40}$/.test(evidence?.result?.merge ?? '') ||
    evidence?.template !== true ||
    evidence?.published !== true
  )
    reasons.push('successful full verification, template, cleanup or App publication is unavailable');
  const failed =
    evidence?.state === 'failure' &&
    reasons.every((r) => r === 'successful full verification, template, cleanup or App publication is unavailable');
  return {
    state: failed ? 'failure' : reasons.length ? 'pending' : 'success',
    failing: failed ? ['local-ci/verify'] : [],
    pending: reasons,
  };
}

export async function collectEvidence({ store, github, worker, policy, repository, health, operationalProof }, number) {
  const pr = await github.pr(number);
  const row = store.current(number);
  const job = row && store.get(row.job);
  let result = null;
  try {
    result = JSON.parse(job?.detail);
  } catch {
    /* Incomplete receipts stay unavailable. */
  }
  const spec = job && JSON.parse(job.spec);
  const supervisor = await worker.health();
  const valid = job && store.isCurrent(job) && job.context === contextKey(pr, policy) && spec.metadata === metadataDigest(pr);
  const published = valid && (await github.published(job));
  const stillCurrent = valid && store.isCurrent(job) && store.get(job.id).state === job.state;
  return {
    version: 1,
    repository,
    number,
    observedAt: new Date().toISOString(),
    head: job?.head,
    base: job?.base,
    baseRef: spec?.baseRef,
    metadata: spec?.metadata,
    policy,
    job: job?.id,
    state: stillCurrent ? job.state : 'superseded',
    result,
    template: stillCurrent && job.state === 'success',
    published: published === true,
    operationalProof: operationalProof === true,
    health: {
      ...health,
      ok:
        health.ok === true &&
        supervisor.blocked === false &&
        typeof supervisor.busy === 'boolean' &&
        !store.jobs().some((j) => j.state === 'cleaning'),
    },
    pr,
  };
}

export async function readTrustedEvidence(number, configPath = READER_CONFIG) {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Evidence requires a PR number');
  await trustedPath(configPath);
  const cfg = JSON.parse(await readFile(configPath, 'utf8'));
  if (
    cfg.version !== 1 ||
    cfg.enabled !== true ||
    cfg.repository !== 'caraseli02/agent-Commerce' ||
    !Number.isSafeInteger(cfg.coordinatorUid) ||
    cfg.coordinatorUid <= 0 ||
    !/^[a-f0-9]{64}$/.test(cfg.policy ?? '')
  )
    throw new Error('Invalid or disabled pinned CI reader configuration');
  const socket = cfg.evidenceSocket;
  if (typeof socket !== 'string' || !socket.startsWith('/') || (await realpath(socket)) !== socket)
    throw new Error('Invalid evidence socket path');
  const info = await lstat(socket);
  if (!info.isSocket() || info.uid !== cfg.coordinatorUid) throw new Error('Evidence socket has an untrusted owner');
  for (let part = dirname(socket); ; part = dirname(part)) {
    const dir = await lstat(part);
    if (![0, cfg.coordinatorUid].includes(dir.uid) || dir.mode & 0o022)
      throw new Error('Evidence socket directory is writable by an untrusted account');
    if (part === '/') break;
  }
  const evidence = await new Promise((resolve, reject) => {
    const req = request({ socketPath: socket, path: `/evidence/${number}`, timeout: 10_000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) req.destroy(new Error('Evidence response too large'));
      });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) throw new Error('CI evidence unavailable');
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('CI evidence timed out')));
    req.end();
  });
  const checks = assessEvidence(evidence, { repository: cfg.repository, pr: evidence.pr, policy: cfg.policy });
  return { ...evidence, checks };
}
