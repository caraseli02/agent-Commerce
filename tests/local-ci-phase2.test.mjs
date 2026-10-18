import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { Store } from '../scripts/local-ci/store.mjs';
import { GitHub } from '../scripts/local-ci/github.mjs';
import { assessEvidence, metadataDigest, collectEvidence, readTrustedEvidence } from '../scripts/local-ci/evidence.mjs';
import { localReadiness } from '../scripts/local-ci/readiness.mjs';
import { Attention } from '../scripts/local-ci/attention.mjs';

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
  await observe({ ok: false, error: 'First outage' });
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
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM attention WHERE state='pending'").get().n, 1);
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
