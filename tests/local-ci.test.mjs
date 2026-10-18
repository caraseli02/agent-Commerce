import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Store } from '../scripts/local-ci/store.mjs';
import { Supervisor, validateSpec, listen, rpc } from '../scripts/local-ci/worker.mjs';
import { loadConfig } from '../scripts/local-ci/config.mjs';
import { command } from '../scripts/local-ci/process.mjs';
import { GitHub } from '../scripts/local-ci/github.mjs';

const head = '1'.repeat(40);
const base = '2'.repeat(40);
const body = `## Verification
${['build', 'lint', 'typecheck', 'test'].map((s) => `- [x] \`pnpm ${s}\` — pass`).join('\n')}
## Known risks
none
## Evaluator rubric
${['Scope control', 'Acceptance criteria', 'Verification evidence', 'Harness hygiene', 'Risk reporting'].map((s) => `${s}: /2`).join('\n')}`;
const pr = (number = 1, author = 'claude') => ({
  number,
  state: 'open',
  body,
  labels: [],
  user: { login: author },
  head: { sha: head },
  base: { sha: base, ref: 'main' },
});

async function fixture(t, initial = [pr()]) {
  const dir = await mkdtemp(join(tmpdir(), 'local-ci-test-'));
  const data = { prs: initial, base, statuses: [], calls: [], outage: false, invalidAuth: false, drop: false };
  const server = createServer(async (req, res) => {
    data.calls.push(req.url);
    if (data.outage || data.invalidAuth) {
      res.writeHead(data.invalidAuth ? 401 : 503);
      res.end('{}');
      return;
    }
    if (req.headers.authorization !== 'Bearer test-only-token') {
      res.writeHead(401);
      res.end('{}');
      return;
    }
    const path = req.url.replace('/repos/caraseli02/agent-Commerce', '');
    res.setHeader('Content-Type', 'application/json');
    if (path.startsWith('/pulls?')) res.end(JSON.stringify(data.prs.filter((p) => p.state === 'open')));
    else if (path.startsWith('/pulls/')) res.end(JSON.stringify(data.prs.find((p) => p.number === Number(path.split('/')[2]))));
    else if (path.startsWith('/git/ref/heads/')) res.end(JSON.stringify({ object: { sha: data.base } }));
    else if (path.startsWith('/commits/')) res.end(JSON.stringify(data.statuses.filter((s) => s.sha === path.split('/')[2]).reverse()));
    else if (path.startsWith('/statuses/') && req.method === 'POST') {
      let text = '';
      for await (const chunk of req) text += chunk;
      data.statuses.push({ ...JSON.parse(text), sha: path.split('/')[2], creator: { id: 7 } });
      if (data.drop) {
        data.drop = false;
        res.destroy();
      } else res.end('{}');
    } else {
      res.writeHead(404);
      res.end('{}');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const children = [];
  const launch = async () => {
    const child = fork(fileURLToPath(new URL('./fixtures/local-ci-child.mjs', import.meta.url)), [], {
      env: { PATH: process.env.PATH, TEST_CI_API: `http://127.0.0.1:${server.address().port}`, TEST_CI_DB: join(dir, 'queue.db') },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    children.push(child);
    let id = 0;
    const pending = new Map();
    const events = [];
    child.on('message', (message) => {
      if (message.event) {
        events.push(message);
        return;
      }
      const resolve = pending.get(message.id);
      pending.delete(message.id);
      resolve?.(message);
    });
    const call = async (action, value) => {
      const n = ++id;
      const result = await new Promise((resolve) => {
        pending.set(n, resolve);
        child.send({ id: n, action, value });
      });
      if (result.error) throw new Error(result.error);
      return result.result;
    };
    for (let n = 0; !events.some((e) => e.event === 'ready'); n++) {
      if (n > 300 || child.exitCode !== null) throw new Error('Fixture process failed to start');
      await new Promise((r) => setTimeout(r, 10));
    }
    return { child, call, events };
  };
  t.after(async () => {
    for (const child of children)
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
        await once(child, 'exit');
      }
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  });
  return { dir, data, launch };
}

test('Claude, Codex and human PRs discover, deduplicate and publish exact-head success through HTTP', async (t) => {
  const f = await fixture(t, [pr(1, 'claude'), pr(2, 'codex'), pr(3, 'human')]);
  const c = await f.launch();
  await c.call('recover');
  await c.call('discover');
  await c.call('discover');
  assert.equal((await c.call('jobs')).length, 3);
  await c.call('publish');
  for (let n = 0; n < 3; n++) await c.call('execute');
  await c.call('publish');
  assert.deepEqual(
    (await c.call('jobs')).map((j) => j.state),
    ['success', 'success', 'success'],
  );
  assert(f.data.statuses.some((s) => s.state === 'pending'));
  assert.equal(f.data.statuses.at(-1).state, 'success');
  assert.equal(f.data.statuses.at(-1).sha, head);
  assert.equal(
    c.events.filter((e) => e.event === 'worker-started').length,
    1,
    'identical execution inputs reuse computation while each PR template is validated',
  );
  assert.match(f.data.statuses.at(-1).description, /base:2222222222 policy:aaaaaaaaaa/);
});

test('new head supersedes obsolete queued job and never inherits old green', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  await c.call('execute');
  await c.call('publish');
  f.data.prs[0].head.sha = '3'.repeat(40);
  await c.call('discover');
  await c.call('publish');
  assert.equal(f.data.statuses.at(-1).state, 'pending');
  assert.equal(f.data.statuses.at(-1).sha, '3'.repeat(40));
  f.data.prs[0].head.sha = '4'.repeat(40);
  await c.call('discover');
  assert.deepEqual(
    (await c.call('jobs')).map((j) => j.state),
    ['success', 'superseded', 'queued'],
  );
});

test('current base tip invalidates success even when PR cached base SHA is unchanged', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  await c.call('execute');
  f.data.base = '5'.repeat(40);
  await c.call('publish');
  await c.call('publish');
  assert(!f.data.statuses.some((s) => s.state === 'success'));
  assert.equal((await c.call('jobs')).at(-1).base, f.data.base);
  assert.equal(f.data.statuses.at(-1).state, 'pending');
});

test('manual duplicates coalesce; explicit retry of terminal failure creates one new attempt', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('request', 1);
  await c.call('request', 1);
  assert.equal((await c.call('jobs')).length, 1);
  await c.call('mode', 'failure');
  await c.call('execute');
  await c.call('publish');
  assert.equal(f.data.statuses.at(-1).state, 'failure');
  await c.call('request', 1);
  await c.call('request', 1);
  assert.equal((await c.call('jobs')).length, 2);
});

test('queued jobs survive an actual coordinator subprocess restart', async (t) => {
  const f = await fixture(t, [pr(1), pr(2)]);
  const c = await f.launch();
  await c.call('discover');
  c.child.kill('SIGKILL');
  await once(c.child, 'exit');
  const resumed = await f.launch();
  await resumed.call('recover');
  assert.equal((await resumed.call('jobs')).filter((j) => j.state === 'queued').length, 2);
  await resumed.call('execute');
  assert.equal((await resumed.call('jobs'))[0].state, 'success');
});

test('crash during verification becomes error only after cleanup proof, then explicit retry', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  await c.call('mode', 'crash');
  c.call('execute');
  await once(c.child, 'exit');
  const resumed = await f.launch();
  await resumed.call('cleanup', false);
  await assert.rejects(resumed.call('recover'), /cleanup/);
  assert.equal((await resumed.call('jobs'))[0].state, 'running');
  await resumed.call('cleanup', true);
  await resumed.call('recover');
  await resumed.call('publish');
  assert.equal(f.data.statuses.at(-1).state, 'error');
  await resumed.call('request', 1);
  await resumed.call('execute');
  assert.equal((await resumed.call('jobs')).at(-1).state, 'success');
});

test('lost GitHub response after publication converges without duplicate status POST', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  f.data.drop = true;
  await assert.rejects(c.call('publish'));
  assert.equal(f.data.statuses.length, 1);
  await c.call('publish');
  assert.equal(f.data.statuses.length, 1);
});

test('another actor cannot impersonate the App publication in lost-response reconciliation', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  f.data.drop = true;
  await assert.rejects(c.call('publish'));
  f.data.statuses[0].creator.id = 999;
  await c.call('publish');
  assert.equal(f.data.statuses.length, 2);
  assert.equal(f.data.statuses.at(-1).creator.id, 7);
});

test('GitHub outage and invalid credentials preserve queued jobs and outbox', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  f.data.outage = true;
  await assert.rejects(c.call('discover'), /503/);
  await assert.rejects(c.call('publish'), /503/);
  assert.equal((await c.call('jobs'))[0].state, 'queued');
  f.data.outage = false;
  f.data.invalidAuth = true;
  await assert.rejects(c.call('publish'), /401/);
  f.data.invalidAuth = false;
  await c.call('publish');
  assert.equal(f.data.statuses.at(-1).state, 'pending');
});

test('one running job excludes another and head change during run supersedes its outcome', async (t) => {
  const f = await fixture(t, [pr(1), pr(2)]);
  const c = await f.launch();
  await c.call('discover');
  await c.call('mode', 'wait');
  const running = c.call('execute');
  while (!c.events.some((e) => e.event === 'worker-started')) await new Promise((r) => setTimeout(r, 10));
  assert.equal(await c.call('execute'), false);
  f.data.prs[0].head.sha = '6'.repeat(40);
  await c.call('discover');
  c.child.send({ action: 'release' });
  await running;
  assert.equal((await c.call('jobs'))[0].state, 'superseded');
});

test('base changes during run supersede integration evidence', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  await c.call('mode', 'wait');
  const running = c.call('execute');
  while (!c.events.some((e) => e.event === 'worker-started')) await new Promise((r) => setTimeout(r, 10));
  f.data.base = '7'.repeat(40);
  c.child.send({ action: 'release' });
  await running;
  assert.equal((await c.call('jobs'))[0].state, 'superseded');
});

test('metadata edits revalidate trusted PR template; no worker executes an invalid body', async (t) => {
  const f = await fixture(t);
  const c = await f.launch();
  await c.call('discover');
  await c.call('execute');
  f.data.prs[0].body = 'missing template';
  await c.call('discover');
  await c.call('execute');
  await c.call('publish');
  assert.equal((await c.call('jobs')).at(-1).state, 'failure');
  assert.equal(c.events.filter((e) => e.event === 'worker-started').length, 1);
});

test('failed cleanup blocks the next worker, never publishes success', async (t) => {
  const f = await fixture(t, [pr(1), pr(2)]);
  const c = await f.launch();
  await c.call('discover');
  await c.call('cleanup', false);
  await c.call('execute');
  await c.call('publish');
  assert.equal((await c.call('jobs'))[0].state, 'cleaning');
  assert.equal(await c.call('execute'), false);
  assert(!f.data.statuses.some((s) => s.state === 'success'));
});

test('retention preserves current and unsent jobs while pruning bounded terminal history', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-retention-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(join(dir, 'queue'));
  t.after(() => store.close());
  const first = store.observe(pr(), 'a'.repeat(64));
  store.finish(first.id, 'failure');
  store.observe(pr(), 'a'.repeat(64), true);
  assert.equal(store.prune({ count: 0, days: 0 }).length, 0);
  for (const p of store.publications()) store.sent(p.id);
  assert.deepEqual(store.prune({ count: 0, days: 0 }), [first.id]);
});

test('worker RPC excludes a second listener and rejects untrusted job paths', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-ipc-'));
  const socket = join(dir, 'socket');
  const server = await listen(socket, () => ({ ok: true }));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  });
  assert.deepEqual(await rpc(socket, '/health'), { ok: true });
  await assert.rejects(
    listen(socket, () => ({})),
    /already running/,
  );
  assert.throws(() => validateSpec({ id: '../../owner-home', head, base, policy: 'a'.repeat(64) }));
  const supervisor = new Supervisor({ workerRoot: dir });
  await assert.rejects(supervisor.run({}), /identity/);
});

test('host process limits fail closed and isolate control channel from PR output', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-log-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const log = join(dir, 'stdout');
  const controlLog = join(dir, 'control');
  const result = await command(process.execPath, ['-e', 'process.stdout.write("forged PASS");process.stderr.write("trusted error")'], {
    log,
    controlLog,
  });
  assert.equal(result.code, 0);
  assert.equal(await readFile(controlLog, 'utf8'), 'trusted error');
  assert.equal(await readFile(log, 'utf8'), 'forged PASS');
  const captured = await command(process.execPath, ['-e', 'process.stdout.write("revision")'], { log, capture: true });
  assert.equal(captured.output, 'revision');
  await assert.rejects(command(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 30 }), /timeout/);
  await assert.rejects(command(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], { limit: 20 }), /limit/);
});

test('untrusted or disabled installation cannot activate CI', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-config-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'config.json');
  await writeFile(path, JSON.stringify({ enabled: true }));
  await assert.rejects(loadConfig(path), /root-owned|symlinks/);
});

test('missing App credentials fail before any API request', async () => {
  const github = new GitHub({ repository: 'caraseli02/agent-Commerce' });
  await assert.rejects(github.token(), /credentials are missing/);
});

test('unknown/live supervisor ownership fails closed without killing the process', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-orphan-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { mkdir } = await import('node:fs/promises');
  const id = '12345678-1234-1234-1234-123456789abc';
  await mkdir(join(dir, id));
  await writeFile(join(dir, id, 'process.json'), JSON.stringify({ pid: process.pid }));
  const supervisor = new Supervisor({ workerRoot: dir, policy: 'a'.repeat(64) });
  assert.equal(await supervisor.recover(), false);
  process.kill(process.pid, 0);
  await assert.rejects(supervisor.run({ id, head, base, policy: 'b'.repeat(64) }), /policy differ/);
});

test('a shared SHA cannot turn green when another current PR template fails', async (t) => {
  const invalid = pr(2);
  invalid.body = 'invalid';
  const f = await fixture(t, [pr(1), invalid]);
  const c = await f.launch();
  await c.call('discover');
  await c.call('execute');
  await c.call('publish');
  assert.equal(f.data.statuses.at(-1).state, 'pending');
  await c.call('execute');
  await c.call('publish');
  assert.equal(f.data.statuses.at(-1).state, 'failure');
});

test('supervisor takes exclusion before awaiting orphan reconciliation', async () => {
  const supervisor = new Supervisor({ policy: 'a'.repeat(64) });
  let release;
  supervisor.recover = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const spec = { id: '12345678-1234-1234-1234-123456789abc', head, base, policy: 'a'.repeat(64) };
  const first = supervisor.run(spec);
  await assert.rejects(supervisor.run(spec), /busy/);
  release(false);
  await assert.rejects(first, /cleanup/);
});

test('architecture allows only the local-CI GitHub credential boundary, not other worker files', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-architecture-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { mkdir, copyFile } = await import('node:fs/promises');
  await mkdir(join(dir, 'scripts/local-ci'), { recursive: true });
  const checker = join(dir, 'scripts/check-arch-invariants.mjs');
  await copyFile(fileURLToPath(new URL('../scripts/check-arch-invariants.mjs', import.meta.url)), checker);
  const header = 'const headers = { Authorization: "Bearer example" };';
  await writeFile(join(dir, 'scripts/local-ci/github.mjs'), header);
  assert.equal(spawnSync(process.execPath, [checker]).status, 0);
  await writeFile(join(dir, 'scripts/local-ci/worker.mjs'), header);
  const result = spawnSync(process.execPath, [checker], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /scripts\/local-ci\/worker.mjs/);
});
