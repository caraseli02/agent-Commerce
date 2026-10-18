import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import { Store } from '../scripts/local-ci/store.mjs';
import { GitHub } from '../scripts/local-ci/github.mjs';
import {
  assessEvidence,
  metadataDigest,
  collectEvidence,
  readTrustedEvidence,
  publicEvidenceHandler,
} from '../scripts/local-ci/evidence.mjs';
import { localReadiness } from '../scripts/local-ci/readiness.mjs';
import { Attention } from '../scripts/local-ci/attention.mjs';
import { startCoordinator } from '../scripts/local-ci/service.mjs';
import { Coordinator } from '../scripts/local-ci/coordinator.mjs';
import { listen, rpc, WorkerClient } from '../scripts/local-ci/worker.mjs';

const repository = 'caraseli02/agent-Commerce';
const policy = 'a'.repeat(64);
const head = 'b'.repeat(40);
const base = 'c'.repeat(40);
const pr = () => ({
  number: 1,
  state: 'open',
  draft: false,
  mergeable: true,
  mergeable_state: 'clean',
  head: { sha: head, ref: 'claude/issue-1' },
  base: { sha: base, ref: 'main' },
  body: 'Closes #1',
  labels: [{ name: 'agent:claude' }],
});
const receipt = (p = pr()) => ({
  version: 1,
  repository,
  number: 1,
  observedAt: new Date().toISOString(),
  health: { ok: true, observedAt: new Date().toISOString() },
  head,
  base,
  baseRef: 'main',
  policy,
  metadata: metadataDigest(p),
  operationalProof: true,
  state: 'success',
  result: { state: 'success', cleaned: true, merge: 'd'.repeat(40) },
  published: true,
  template: true,
  pr: p,
});
const pass = (who = 'Codex', verdict = 'PASS') => ({
  user: { login: 'caraseli02' },
  body: `<!-- evaluator-head: ${head} -->\n## Evaluator verdict\n${verdict}\nIndependent evaluator: ${who}.`,
});
const config = {
  protectedPaths: [
    { pattern: 'scripts/**', group: 'factory' },
    { pattern: 'server/api/payments/**', group: 'payments' },
  ],
};

test('public evidence admission bounds bursts across PRs, recovers and never caches context', async () => {
  let now = 0;
  let finish;
  let calls = 0;
  let currentHead = head;
  const handler = publicEvidenceHandler(
    async (number) => {
      calls++;
      if (number === 1)
        await new Promise((resolve) => {
          finish = resolve;
        });
      return { number, head: currentHead };
    },
    () => now,
  );
  const first = handler('GET', '/evidence/1');
  await handler('GET', '/evidence/2');
  await assert.rejects(handler('GET', '/evidence/3'), /Evidence request limit/);
  assert.equal(calls, 2, 'Rejected work must not reach GitHub or supervisor');
  now = 15000;
  currentHead = 'e'.repeat(40);
  assert.equal((await handler('GET', '/evidence/2')).head, currentHead);
  finish();
  await first;
  await assert.rejects(handler('GET', '/evidence/3'), /Evidence request limit/);
  now += 15000;
  assert.equal((await handler('GET', '/evidence/3')).number, 3);
  for (const path of ['/evidence/0', '/evidence/9007199254740992', '/evidence/1?x=1', '/request'])
    await assert.rejects(handler('GET', path), /Read-only evidence endpoint/);
});

test('public evidence bounds concurrent work even when time replenishes admission', async () => {
  let now = 0;
  const releases = [];
  const handler = publicEvidenceHandler(
    () => new Promise((resolve) => releases.push(resolve)),
    () => now,
  );
  const first = handler('GET', '/evidence/1');
  const second = handler('GET', '/evidence/2');
  now = 60000;
  await assert.rejects(handler('GET', '/evidence/3'), /Evidence request limit/);
  assert.equal(releases.length, 2);
  releases.forEach((resolve) => resolve({}));
  await Promise.all([first, second]);
});

test('public evidence caps paginated API work and releases failed slots', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return { ok: true, status: 200, json: async () => Array(100).fill({}) };
  });
  const github = new GitHub({ repository, tokenProvider: async () => 'fixture' });
  let now = 0;
  const handler = publicEvidenceHandler(
    () => github.list('/issues/1/comments'),
    () => now,
  );
  await assert.rejects(handler('GET', '/evidence/1'), /Evidence API budget/);
  assert.equal(calls, 40, 'Pagination cannot consume an unbounded API budget');
  now = 15000;
  await assert.rejects(handler('GET', '/evidence/2'), /Evidence API budget/);
  assert.equal(calls, 80, 'A failed request releases its slot while retaining its rate cost');
});

test('read-only socket rejects methods and request bodies before evidence work', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-read-limits-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let calls = 0;
  const socketPath = join(dir, 'e');
  const server = await listen(
    socketPath,
    () => {
      calls++;
      return {};
    },
    0o666,
    { readOnly: true },
  );
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const send = (method, headers = {}, body) =>
    new Promise((resolve, reject) => {
      const req = request({ socketPath, path: '/evidence/1', method, headers }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end(body);
    });
  assert.equal(await send('POST'), 503);
  assert.equal(await send('GET', { 'Content-Length': '1' }, 'x'), 503);
  assert.equal(await send('GET', { 'Transfer-Encoding': 'chunked' }, 'x'), 503);
  assert.equal(calls, 0);
  assert.equal(await send('GET'), 200);
  assert.equal(calls, 1);
});

test('green status alone is insufficient; full current healthy receipt is required', () => {
  const p = pr();
  const check = (e) => assessEvidence(e, { repository, pr: p, policy });
  assert.equal(check(receipt()).state, 'success');
  for (const e of [
    null,
    { state: 'success' },
    { ...receipt(), number: 2 },
    { ...receipt(), repository: 'other/repo' },
    { ...receipt(), policy: 'f'.repeat(64) },
    { ...receipt(), operationalProof: false },
    { ...receipt(), base: 'e'.repeat(40) },
    { ...receipt(), head: 'e'.repeat(40) },
    { ...receipt(), baseRef: 'release' },
    { ...receipt(), metadata: 'forged' },
    { ...receipt(), published: false },
    { ...receipt(), template: false },
    { ...receipt(), result: { state: 'success', cleaned: false, merge: head } },
    { ...receipt(), result: { state: 'success', cleaned: true } },
    { ...receipt(), health: { ok: false } },
    { ...receipt(), observedAt: '2000-01-01' },
    { ...receipt(), health: { ok: true, observedAt: '2000-01-01' } },
    { ...receipt(), observedAt: new Date(Date.now() + 50000).toISOString() },
  ])
    assert.notEqual(check(e).state, 'success', JSON.stringify(e));
  for (const changed of [
    { ...p, body: 'edited' },
    { ...p, labels: [...p.labels, { name: 'owner-approved-harness' }] },
  ])
    assert.notEqual(assessEvidence(receipt(), { repository, pr: changed, policy }).state, 'success');
});

test('readiness requires independent exact-head PASS, owner policy and no conflicts/change requests', async () => {
  const p = pr();
  let comments = [pass()];
  let reviews = [];
  let files = [];
  const github = { list: async (path) => (path.includes('/comments') ? comments : path.includes('/reviews') ? reviews : files) };
  const run = () => localReadiness({ github, pr: p, evidence: receipt(p), repository, policy, config, owner: 'caraseli02' });
  assert.equal((await run()).ready, true);
  for (const bad of [
    [pass('Claude')],
    [{ ...pass(), user: { login: 'outsider' } }],
    [pass(), pass('Codex', 'FAIL')],
    [{ ...pass(), body: pass().body.replace(head, 'f'.repeat(40)) }],
    [],
  ]) {
    comments = bad;
    assert.equal((await run()).ready, false);
  }
  comments = [pass()];
  for (const state of ['dirty', 'unknown', 'blocked']) {
    p.mergeable_state = state;
    assert.equal((await run()).ready, false);
  }
  p.mergeable_state = 'clean';
  p.draft = true;
  assert.equal((await run()).ready, false);
  p.draft = false;
  p.mergeable = null;
  assert.equal((await run()).ready, false);
  p.mergeable = true;
  reviews = [{ state: 'CHANGES_REQUESTED', user: { login: 'human' } }];
  assert.equal((await run()).ready, false);
  reviews = [];
  files = [{ filename: 'scripts/test.mjs' }];
  assert.equal((await run()).ready, false);
  p.labels.push({ name: 'owner-approved-harness' });
  assert.equal((await run()).ready, true);
  files = [{ filename: 'server/api/payments/foo.ts' }];
  assert.equal((await run()).ready, false);
  files = [{ filename: 'moved.mjs', previous_filename: 'scripts/protected.mjs' }];
  p.labels.pop();
  assert.equal((await run()).ready, false);
});

test('store evidence checks current context, authenticated publication, supervisor cleanup and proof', async () => {
  const store = new Store(':memory:');
  try {
    const p = pr();
    const job = store.observe(p, policy);
    store.finish(job.id, 'success', JSON.stringify(receipt().result));
    const args = {
      store,
      github: { pr: async () => p, published: async () => true },
      worker: { health: async () => ({ busy: false, blocked: false }) },
      policy,
      repository,
      health: receipt().health,
      operationalProof: true,
    };
    assert.equal(assessEvidence(await collectEvidence(args, 1), { repository, pr: p, policy }).state, 'success');
    p.body = 'edited';
    assert.equal((await collectEvidence(args, 1)).state, 'superseded');
    p.body = 'Closes #1';
    args.worker.health = async () => ({ busy: false, blocked: true });
    assert.equal((await collectEvidence(args, 1)).health.ok, false);
    args.github.published = async () => false;
    assert.equal((await collectEvidence(args, 1)).published, false);
  } finally {
    store.close();
  }
});

test('production reader rejects user-owned configurations before connecting', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-reader-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'reader.json');
  await writeFile(path, JSON.stringify({ version: 1 }));
  await assert.rejects(readTrustedEvidence(1, path), /root-owned|symlinks/);
  await assert.rejects(readTrustedEvidence(0), /PR number/);
});

test('real HTTP lost-response notification survives restart, ignores owner impersonation and deduplicates App delivery', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-attention-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const comments = [];
  let drop = true;
  let posts = 0;
  const server = createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.end(JSON.stringify(comments));
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    posts++;
    const comment = {
      id: posts,
      html_url: `https://github.test/comment/${posts}`,
      user: { id: 7, type: 'Bot' },
      body: JSON.parse(body).body,
    };
    comments.push(comment);
    if (drop) {
      drop = false;
      req.socket.destroy();
      return;
    }
    res.end(JSON.stringify(comment));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const github = new GitHub({
    repository,
    api: `http://127.0.0.1:${server.address().port}`,
    tokenProvider: async () => 'fixture',
    publisherId: 7,
  });
  const db = join(dir, 'queue.sqlite');
  let store = new Store(db);
  const attention = () => new Attention({ store, github, owner: 'caraseli02', issue: 2 });
  const key = attention().enqueue('ready:context', 1, 'Ready for review', 'context');
  comments.push({ user: { id: 99 }, body: '<!-- owner-attention: ready:context -->' });
  await assert.rejects(attention().deliver(new Set([key])));
  store.close();
  store = new Store(db);
  t.after(() => store.close());
  await attention().deliver(new Set([key]));
  await attention().deliver(new Set([key]));
  assert.equal(posts, 1);
  const delivered = store.db.prepare('SELECT * FROM attention WHERE key=?').get(key);
  assert.equal(delivered.state, 'delivered');
  assert.equal(JSON.parse(delivered.delivery).publisherId, 7);
  const obsolete = attention().enqueue('obsolete', 1, 'Never send this', 'old');
  await attention().deliver(new Set());
  assert.equal(store.db.prepare('SELECT state FROM attention WHERE key=?').get(obsolete).state, 'cancelled');
  assert.equal(posts, 1);
});

test('bot-created issue timestamps do not repeat blocked/queue notices; new episodes survive restart', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-attention-episodes-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const db = join(dir, 'queue');
  let store = new Store(db);
  t.after(() => store.close());
  const issues = [
    { number: 1, state: 'open', title: 'Blocked task', body: 'Needs owner', labels: [{ name: 'blocked' }], updated_at: 'old' },
    { number: 2, state: 'open', title: 'Attention', body: '', labels: [], updated_at: 'old' },
  ];
  const comments = new Map();
  let posts = 0;
  const github = {
    publisherId: 7,
    token: async () => 'fixture',
    list: async (path) => (path === '/issues?state=open' ? issues : (comments.get(path) ?? [])),
    repo: async (path, { data }) => {
      const receipt = { id: ++posts, html_url: `https://github.test/${posts}`, user: { id: 7, type: 'Bot' }, body: data.body };
      comments.set(path, [...(comments.get(path) ?? []), receipt]);
      issues.forEach((i) => {
        i.updated_at = new Date().toISOString();
      });
      return receipt;
    },
  };
  const run = () =>
    new Attention({ store, github, owner: 'caraseli02', issue: 2 }).reconcile({
      prs: [],
      results: [],
      config: { mode: 'build', neverClaim: ['blocked'] },
      health: { ok: true },
    });
  await run();
  assert.equal(posts, 2);
  await run();
  await run();
  assert.equal(posts, 2);
  store.close();
  store = new Store(db);
  await run();
  assert.equal(posts, 2);
  issues[0].labels = [];
  await run();
  issues[0].labels = [{ name: 'blocked' }];
  await run();
  assert.equal(posts, 3);
  issues.push({
    number: 3,
    state: 'open',
    title: 'Live',
    body: '',
    labels: [{ name: 'agent:claude' }, { name: 'in-progress' }],
    updated_at: 'new',
  });
  await run();
  issues.pop();
  await run();
  assert.equal(posts, 4);
});

test('outages notify once per episode and notify again after a healthy cycle and restart', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ci-health-episodes-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const db = join(dir, 'queue');
  let store = new Store(db);
  t.after(() => store.close());
  const comments = [];
  let unavailable = false;
  const github = {
    publisherId: 7,
    token: async () => {
      if (unavailable) throw new Error('GitHub unavailable');
      return 'fixture';
    },
    list: async () => comments,
    repo: async (path, { data }) => {
      const comment = { id: comments.length + 1, html_url: `https://github.test/${comments.length + 1}`, user: { id: 7 }, body: data.body };
      comments.push(comment);
      return comment;
    },
  };
  const observe = (health) => new Attention({ store, github, owner: 'caraseli02', issue: 2 }).observeHealth(health, policy);
  const pending = new Attention({ store, github, owner: 'caraseli02', issue: 2 }).enqueue('local-ready:pending', 1, 'Ready', 'job');
  await observe({ ok: false, error: 'First outage' });
  assert.equal(
    store.db.prepare('SELECT state FROM attention WHERE key=?').get(pending).state,
    'pending',
    'Health delivery must preserve unrelated pending notices',
  );
  await observe({ ok: false, error: 'Same outage, different error' });
  assert.equal(comments.length, 1);
  await observe({ ok: true });
  store.close();
  store = new Store(db);
  await observe({ ok: false, error: 'Second outage' });
  await observe({ ok: false });
  assert.equal(comments.length, 2);
  assert.notEqual(comments[0].body, comments[1].body);
  await observe({ ok: true });
  unavailable = true;
  await assert.rejects(observe({ ok: false }), /unavailable/);
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM attention WHERE state='pending' AND context=?").get(`health:${policy}`).n, 1);
  await observe({ ok: true }); // Recovery cancels the undeliverable old outage.
  unavailable = false;
  await observe({ ok: false });
  assert.equal(comments.length, 3);
});

test('unreadable linked-issue provenance is a named readiness prerequisite', async () => {
  const p = pr();
  p.labels = [];
  p.head.ref = 'codex/issue-1';
  const github = {
    list: async () => [],
    repo: async (path) => {
      throw new Error(`${path}: HTTP 404`);
    },
  };
  const result = await localReadiness({ github, pr: p, evidence: receipt(p), repository, policy, config, owner: 'caraseli02' });
  assert.equal(result.ready, false);
  assert(result.reasons.some((reason) => reason.includes('builder provenance unavailable: /issues/1: HTTP 404')));
});

async function coordinatorFixture(t, { list, repo } = {}) {
  const realTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, 'setTimeout', (fn, ms, ...args) => realTimeout(fn, ms >= 60_000 ? 50 : ms, ...args));
  const dir = await mkdtemp(join(tmpdir(), 'ci-cycle-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const worker = await listen(join(dir, 'w'), () => ({ cleaned: true, busy: false, blocked: false }));
  t.after(() => new Promise((resolve) => worker.close(resolve)));
  const cfg = {
    stateRoot: dir,
    coordinatorSocket: join(dir, 'c'),
    evidenceSocket: join(dir, 'e'),
    workerSocket: join(dir, 'w'),
    repository,
    policy,
    notifications: true,
    attentionIssue: 2,
    tokenProvider: async () => 'fixture',
    publisherId: 7,
  };
  const comments = [];
  t.mock.method(GitHub.prototype, 'list', list ?? (async (path) => (path.includes('/comments') ? comments : [])));
  t.mock.method(
    GitHub.prototype,
    'repo',
    repo ??
      (async (path, { data }) => {
        const comment = {
          id: comments.length + 1,
          html_url: `https://github.test/${comments.length + 1}`,
          user: { id: 7 },
          body: data.body,
        };
        comments.push(comment);
        return comment;
      }),
  );
  let cycles = 0;
  t.mock.method(Coordinator.prototype, 'discover', async () => {
    cycles++;
  });
  const service = await startCoordinator(cfg);
  t.after(() => service.stop());
  const until = async (predicate, message) => {
    const deadline = Date.now() + 6000;
    while (!(await predicate())) {
      assert(Date.now() < deadline, message);
      await new Promise((resolve) => realTimeout(resolve, 20));
    }
  };
  return { cfg, service, comments, until, cycles: () => cycles, health: () => rpc(cfg.evidenceSocket, '/health') };
}

for (const failure of ['PR discovery', 'supervisor health'])
  test(`persistent ${failure} failures form one outage until a complete coordinator recovery`, async (t) => {
    let fail = true;
    if (failure === 'PR discovery') {
      t.mock.method(GitHub.prototype, 'prs', async () => {
        if (fail) throw new Error('Evidence discovery unavailable');
        return [];
      });
    } else {
      t.mock.method(GitHub.prototype, 'prs', async () => [pr()]);
      t.mock.method(GitHub.prototype, 'pr', async () => pr());
      t.mock.method(WorkerClient.prototype, 'health', async () => {
        if (fail) throw new Error('Supervisor socket unavailable');
        return { busy: false, blocked: false };
      });
    }
    const fixture = await coordinatorFixture(t);
    const { until, health, comments, cycles } = fixture;
    const outages = () => comments.filter((c) => c.body.includes('local-ci-unhealthy:'));
    await until(() => cycles() >= 4, 'Persistent evidence failure must be retried across coordinator cycles');
    assert.equal(outages().length, 1, 'One persistent coordinator failure must produce one outage notice');
    assert.equal((await health()).ok, false);
    fail = false;
    await until(async () => (await health()).ok, 'A full successful coordinator cycle must recover health');
    await until(
      () =>
        JSON.parse(fixture.service.store.db.prepare('SELECT value FROM meta WHERE key=?').get(`attention:ci-unhealthy:${policy}`).value)
          .active === false,
      'Persisted recovery must close the first episode',
    );
    fail = true;
    const start = cycles();
    await until(() => cycles() >= start + 4, 'Second persistent outage must be retried');
    assert.equal((await health()).ok, false);
    assert.equal(outages().length, 2, 'Only an actual coordinator recovery may open a new outage episode');
  });

test('notification failures remain visible without poisoning acceptance health or stopping worker dispatch', async (t) => {
  t.mock.method(GitHub.prototype, 'prs', async () => []);
  let fail = true;
  const { cfg, service, until, health, cycles } = await coordinatorFixture(t, {
    list: async (path) => {
      if (path === '/issues?state=open') return [{ number: 3, title: 'Blocked', body: '', labels: [{ name: 'blocked' }] }];
      return [];
    },
    repo: async (path, { data }) => {
      if (fail) throw new Error('Notification POST unavailable');
      return { id: 1, html_url: 'https://github.test/1', user: { id: 7 }, body: data.body };
    },
  });
  let workers = 0;
  const prune = service.store.prune.bind(service.store);
  service.store.prune = () => {
    workers++;
    return prune();
  };
  await until(() => cycles() >= 4, 'Notification outage must not stop coordinator polling');
  assert.equal((await health()).ok, true, 'Notification failure must not invalidate successful CI acceptance health');
  await until(() => workers >= 2, 'Notification failure must not stop actual worker iterations');
  const snapshot = JSON.parse(await readFile(join(cfg.stateRoot, 'health.json'), 'utf8'));
  assert.equal(snapshot.notifications.ok, false);
  assert.match(snapshot.notifications.error, /Notification POST unavailable/);
  assert.equal((await rpc(cfg.coordinatorSocket, '/health')).notifications.ok, false);
  fail = false;
  await until(async () => (await health()).notifications.ok, 'Notification recovery must clear its own diagnostic');
});

test('one failed notification leaves its intent pending while unrelated notices are delivered', async () => {
  const store = new Store(':memory:');
  try {
    const delivered = [];
    const github = {
      publisherId: 7,
      token: async () => 'fixture',
      list: async () => [],
      repo: async (path, { data }) => {
        if (path.includes('/issues/1/')) throw new Error('First recipient unavailable');
        delivered.push(data.body);
        return { id: 1, html_url: 'https://github.test/1', user: { id: 7 }, body: data.body };
      },
    };
    const attention = new Attention({ store, github, owner: 'caraseli02', issue: 2 });
    const first = attention.enqueue('first', 1, 'First', 'one');
    const second = attention.enqueue('second', 2, 'Second', 'two');
    await assert.rejects(attention.deliver(new Set([first, second])), /First recipient unavailable/);
    assert.equal(delivered.length, 1, 'A failed notice must not starve unrelated recipients');
    assert.equal(store.db.prepare('SELECT state FROM attention WHERE key=?').get(first).state, 'pending');
    assert.equal(store.db.prepare('SELECT state FROM attention WHERE key=?').get(second).state, 'delivered');
  } finally {
    store.close();
  }
});

test('persistent worker failures stay unhealthy across coordinator cycles and notify once until worker recovery', async (t) => {
  const realTimeout = globalThis.setTimeout;
  t.mock.method(globalThis, 'setTimeout', (fn, ms, ...args) => realTimeout(fn, ms >= 60_000 ? 100 : ms, ...args));
  let cycles = 0;
  const dir = await mkdtemp(join(tmpdir(), 'ci-h-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const comments = [];
  const api = createServer(async (req, res) => {
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const comment = {
        id: comments.length + 1,
        html_url: `https://github.test/${comments.length + 1}`,
        user: { id: 7 },
        body: JSON.parse(body).body,
      };
      comments.push(comment);
      res.end(JSON.stringify(comment));
    } else {
      if (req.url.includes('/pulls?')) cycles++;
      res.end(JSON.stringify(req.url.includes('/comments') ? comments : []));
    }
  });
  await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => api.close(resolve)));
  const worker = await listen(join(dir, 'w'), () => ({ cleaned: true, busy: false, blocked: false }));
  t.after(() => new Promise((resolve) => worker.close(resolve)));
  const cfg = {
    stateRoot: dir,
    coordinatorSocket: join(dir, 'c'),
    evidenceSocket: join(dir, 'e'),
    workerSocket: join(dir, 'w'),
    repository,
    policy,
    notifications: true,
    attentionIssue: 2,
    tokenProvider: async () => 'fixture',
    publisherId: 7,
    api: `http://127.0.0.1:${api.address().port}`,
  };
  const coordinator = await startCoordinator(cfg);
  t.after(() => coordinator.stop());
  const prune = coordinator.store.prune.bind(coordinator.store);
  let failWorker = true;
  let failures = 0;
  coordinator.store.prune = () => {
    if (failWorker) {
      failures++;
      throw new Error('Worker maintenance failed');
    }
    return prune();
  };
  const outages = () => comments.filter((c) => c.body.includes('local-ci-unhealthy:'));
  const until = async (predicate, message) => {
    const deadline = Date.now() + 6000;
    while (!(await predicate())) {
      assert(Date.now() < deadline, message);
      await new Promise((resolve) => realTimeout(resolve, 20));
    }
  };
  await until(() => outages().length === 1, 'Worker failure must notify');
  const firstCycle = cycles;
  await until(() => cycles >= firstCycle + 5, 'Coordinator must continue polling during a worker outage');
  assert.equal((await rpc(cfg.evidenceSocket, '/health')).ok, false, 'Coordinator polling must not clear worker health');
  await until(() => failures >= 3, 'Unhealthy workers must retry to discover recovery');
  assert.equal(outages().length, 1, 'One persistent worker failure must produce exactly one outage notice');
  const health = JSON.parse(await readFile(join(dir, 'health.json'), 'utf8'));
  assert.equal(health.ok, false);
  assert.match(health.error, /Worker maintenance failed/);
  assert.equal((await rpc(cfg.coordinatorSocket, '/health')).ok, false);
  failWorker = false;
  await until(async () => (await rpc(cfg.evidenceSocket, '/health')).ok, 'A successful worker iteration must recover health');
  await until(
    () =>
      JSON.parse(coordinator.store.db.prepare('SELECT value FROM meta WHERE key=?').get(`attention:ci-unhealthy:${policy}`).value)
        .active === false,
    'Recovery must close the outage episode',
  );
  failWorker = true;
  await until(() => outages().length === 2, 'A later worker outage must notify again after actual recovery');
  const secondCycle = cycles;
  await until(() => cycles >= secondCycle + 5, 'Coordinator polling must continue after the second outage');
  assert.equal((await rpc(cfg.evidenceSocket, '/health')).ok, false);
  assert.equal(outages().length, 2, 'The second persistent outage must also deduplicate');
});
