import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assessLocalChecks, localVerificationMarker, parseFactoryConfig, readLocalEvidence } from '../scripts/owner-attention.mjs';
import { checkPushTemplates } from '../scripts/check-pr-template.mjs';

const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const body = readFileSync('.github/pull_request_template.md', 'utf8')
  .replaceAll('- [ ]', '- [x]')
  .replaceAll('— outcome:', '— outcome: pass');
const fixture = () => ({
  number: 10,
  state: 'open',
  draft: false,
  mergeable: true,
  mergeable_state: 'clean',
  body,
  labels: [{ name: 'agent:claude' }],
  head: { sha: head, ref: 'claude/issue-1' },
  base: { sha: base, ref: 'main' },
});
const report = (pr = fixture(), who = 'Codex', verdict = 'PASS') => ({
  user: { login: 'owner' },
  body: `<!-- evaluator-head: ${head} -->\n## Evaluator verdict\n${verdict}\nIndependent evaluator: ${who}.\n${localVerificationMarker(pr)}`,
});
const trust = { trustedLogins: ['owner'], expectedEvaluator: 'Codex' };

describe('Husky and independent local acceptance', () => {
  it('accepts actual review evidence without any hosted check or service', () => {
    expect(assessLocalChecks(fixture(), [report()], trust).state).toBe('success');
  });

  it('requires the independent opposite builder, exact context and an unquoted marker', () => {
    const pr = fixture();
    const invalid = [
      { ...report(), user: { login: 'outsider' } },
      report(pr, 'Claude'),
      report(pr, 'Codex', 'FAIL'),
      { ...report(), body: report().body.replace(localVerificationMarker(pr), `> ${localVerificationMarker(pr)}`) },
      { ...report(), body: report().body.replace(`base=${base}`, `base=${head}`) },
      { ...report(), body: 'Please review\n' + report().body },
    ];
    for (const comment of invalid) expect(assessLocalChecks(pr, [comment], trust).state).toBe('pending');
    for (const changed of [
      { ...pr, body: body + '\nchanged' },
      { ...pr, labels: [] },
      { ...pr, base: { sha: base, ref: 'other' } },
    ]) {
      expect(assessLocalChecks(changed, [report()], trust).state).toBe('pending');
    }
    expect(assessLocalChecks({ ...pr, body: '' }, [report()], trust).state).toBe('failure');
  });

  it('uses the same metadata marker in the native Python router', () => {
    const pr = { ...fixture(), body: body + '\nUnicode: café', labels: [{ name: 'z' }, { name: 'a' }] };
    const result = execFileSync(
      'python3',
      [
        '-c',
        'import json,sys;sys.path.insert(0,".codex-autonomy");from router import local_verification_marker;print(local_verification_marker(json.load(sys.stdin)))',
      ],
      { input: JSON.stringify(pr), encoding: 'utf8' },
    );
    expect(result.trim()).toBe(localVerificationMarker(pr));
  });

  it('validates live PR metadata before push and propagates lookup failures', () => {
    const input = `refs/heads/topic ${head} refs/heads/topic ${base}\n`;
    expect(() => checkPushTemplates(input, { run: () => JSON.stringify([{ number: 10, body, labels: [] }]) })).not.toThrow();
    expect(() => checkPushTemplates(input, { run: () => JSON.stringify([{ number: 10, body: '', labels: [] }]) })).toThrow('PR #10');
    expect(() =>
      checkPushTemplates(input, {
        run: () => {
          throw new Error('GitHub unavailable');
        },
      }),
    ).toThrow('GitHub unavailable');
    expect(() => checkPushTemplates(input, { run: () => '[]' })).not.toThrow();
    checkPushTemplates(`refs/heads/topic ${'0'.repeat(40)} refs/heads/topic ${base}`, {
      run: () => {
        throw new Error('deletion must not query PRs');
      },
    });
  });

  async function readiness({
    comments = [report()],
    reviews = [],
    files = [],
    changed = false,
    mergeable = true,
    authorized = false,
  }: {
    comments?: ReturnType<typeof report>[];
    reviews?: { state: string; user: { login: string } }[];
    files?: { filename: string }[];
    changed?: boolean;
    mergeable?: boolean;
    authorized?: boolean;
  } = {}) {
    const pr = { ...fixture(), mergeable };
    if (authorized) pr.labels.push({ name: 'owner-approved-harness' });
    if (authorized) comments = [report(pr)];
    let reads = 0;
    const gh = {
      get: async (path: string) => {
        if (path.startsWith('/git/ref/')) return { object: { sha: base } };
        if (path === '/pulls/10') return { ...pr, head: { ...pr.head, sha: changed && reads++ > 0 ? base : head } };
        throw new Error('Unexpected path ' + path);
      },
      paginate: async (path: string) => {
        if (path.endsWith('/comments')) return comments;
        if (path.endsWith('/reviews')) return reviews;
        if (path.endsWith('/files')) return files;
        throw new Error('Unexpected path ' + path);
      },
    };
    return readLocalEvidence(10, {
      gh,
      owner: 'owner',
      config: parseFactoryConfig(await readFile('.factory/factory.yaml', 'utf8')),
    });
  }

  it('keeps real failures, contradictory reports, changes requested and context races blocking', async () => {
    expect((await readiness()).readiness.ready).toBe(true);
    for (const options of [
      { comments: [report(), report(fixture(), 'Codex', 'FAIL')] },
      { reviews: [{ state: 'CHANGES_REQUESTED', user: { login: 'human' } }] },
      { changed: true },
      { mergeable: false },
      { files: [{ filename: 'scripts/example.mjs' }] },
    ])
      expect((await readiness(options)).readiness.ready).toBe(false);
    expect((await readiness({ authorized: true, files: [{ filename: 'scripts/example.mjs' }] })).readiness.ready).toBe(true);
  });

  it('allows payment paths with a current independent PASS, without a harness exception', async () => {
    const files = [
      { filename: 'server/api/payments/example.ts' },
      { filename: 'app/components/payment/SessionCardForm.vue' },
      { filename: 'app/pages/checkout/index.vue' },
      { filename: 'server/infrastructure/migrations/020-example.sql' },
    ];
    expect((await readiness({ files })).readiness.ready).toBe(true);
    expect((await readiness({ files, comments: [] })).readiness.ready).toBe(false);
    expect((await readiness({ files: [...files, { filename: '.factory/factory.yaml' }] })).readiness.ready).toBe(false);
  });

  it('retains old-context and legacy reports without contradicting a new-context result', async () => {
    const old = report({ ...fixture(), body: body + '\nprevious context' }, 'Codex', 'FAIL');
    expect((await readiness({ comments: [old, report()] })).readiness.ready).toBe(true);
    const legacy = {
      ...old,
      body: old.body
        .split('\n')
        .filter((line) => !line.startsWith('<!-- local-verification:'))
        .join('\n'),
    };
    expect((await readiness({ comments: [legacy, report()] })).readiness.ready).toBe(true);
    expect((await readiness({ comments: [legacy] })).readiness.ready).toBe(false);
  });
});
