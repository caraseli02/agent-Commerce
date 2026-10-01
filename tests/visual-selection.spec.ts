import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assessmentPath, nonObservable, plan, runSelection, select } from '../scripts/select-visual-checks.mjs';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'visual-selection-'));
  roots.push(cwd);
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '/dev/null');
  const write = (file: string, content: string) => {
    mkdirSync(join(cwd, file, '..'), { recursive: true });
    writeFileSync(join(cwd, file), content);
  };
  const commit = () => {
    git('add', '.');
    git('commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  write('server/internal.ts', 'original');
  write('pages/index.vue', '<div>original</div>');
  const base = commit();
  git('update-ref', 'refs/remotes/origin/main', base);
  const push = (before = base, after = git('rev-parse', 'HEAD')) => `refs/heads/main ${after} refs/heads/main ${before}\n`;
  return { cwd, git, write, commit, base, push };
}

describe('visual impact selection', () => {
  it('skips known documentation/tooling while treating indirect runtime paths conservatively', () => {
    expect(nonObservable('docs/agents/verification.md')).toBe(true);
    expect(nonObservable('tests/payment.spec.ts')).toBe(true);
    for (const path of [
      'server/api/products.ts',
      'store/cart.ts',
      'composables/useProduct.ts',
      'types/product.ts',
      'data/catalog.json',
      'nuxt.config.ts',
      'pnpm-lock.yaml',
      'scripts/build-with-tailwind-guard.mjs',
      'tests/visual/visual-regression.spec.ts',
    ]) {
      expect(nonObservable(path), path).toBe(false);
      expect(select([path], 'hash').mode).toBe('full');
    }
  });
  it('requires a matching fingerprint and consumer trace for backend-only skips', () => {
    const assessment = {
      fingerprint: 'hash',
      impact: 'none',
      reason: 'Internal operation only',
      consumers: 'No route or client caller; no observable state changes.',
    };
    expect(select(['server/internal.ts'], 'hash', [assessment]).mode).toBe('skip');
    expect(select(['server/internal.ts'], 'new-hash', [assessment]).mode).toBe('full');
    expect(select(['server/internal.ts'], 'hash', [{ ...assessment, consumers: '' }]).mode).toBe('full');
  });
  it('selects named tests only and refuses empty/unknown or uncertain selections', () => {
    const assessment = {
      fingerprint: 'hash',
      impact: 'targeted',
      reason: 'Product rendering changed',
      consumers: '/product, purchase panel',
      tests: ['product'],
    };
    expect(select(['pages/product.vue'], 'hash', [assessment]).tests).toEqual(['product']);
    for (const tests of [[], ['typo']]) expect(select(['pages/product.vue'], 'hash', [{ ...assessment, tests }]).mode).toBe('full');
    expect(select(['pages/product.vue'], 'hash', [{ ...assessment, impact: 'uncertain' }]).mode).toBe('full');
  });
  it('uses all commits for first pushes and the remote tip for subsequent pushes', () => {
    const r = repository();
    r.write('pages/index.vue', '<div>changed</div>');
    const first = r.commit();
    r.write('README.md', 'docs');
    r.commit();
    expect(plan({ cwd: r.cwd, input: r.push('0'.repeat(40)) }).mode).toBe('full');
    expect(plan({ cwd: r.cwd, input: r.push(first) }).mode).toBe('skip');
  });
  it('includes both sides of renames and deleted runtime paths', () => {
    const r = repository();
    r.git('mv', 'pages/index.vue', 'README.md');
    r.git('rm', 'server/internal.ts');
    r.commit();
    const result = plan({ cwd: r.cwd, input: r.push() });
    expect(result.mode).toBe('full');
    expect(result.decisions[0]!.files).toEqual(['pages/index.vue', 'server/internal.ts']);
  });
  it('binds a committed assessment to runtime diff, independent of documentation edits', () => {
    const r = repository();
    r.write('server/internal.ts', 'internal backend operation');
    r.commit();
    const fingerprint = plan({ cwd: r.cwd, input: r.push() }).decisions[0]!.fingerprint;
    r.write(
      assessmentPath,
      JSON.stringify({
        assessments: [{ fingerprint, impact: 'none', reason: 'Internal only', consumers: 'No UI callers or UI-visible writes' }],
      }),
    );
    r.write('README.md', 'assessment explanation');
    r.commit();
    expect(plan({ cwd: r.cwd, input: r.push() }).mode).toBe('skip');
    r.write('server/internal.ts', 'changed again');
    r.commit();
    expect(plan({ cwd: r.cwd, input: r.push() }).mode).toBe('full');
  });
  it('does not let an uncommitted reversal hide pushed runtime changes', () => {
    const r = repository();
    r.write('pages/index.vue', '<div>changed</div>');
    r.commit();
    r.write('pages/index.vue', '<div>original</div>');
    const result = plan({ cwd: r.cwd, input: r.push() });
    expect(result.mode).toBe('full');
    expect(result.decisions).toHaveLength(2);
  });
  it('includes staged/unstaged and untracked runtime state, unions multiple refs, skips ref deletions', () => {
    const r = repository();
    r.write('README.md', 'docs');
    const docs = r.commit();
    r.write('store/new.ts', 'export const value = 1;');
    expect(plan({ cwd: r.cwd, base: r.base, local: true }).mode).toBe('full');
    const runtime = r.commit();
    expect(plan({ cwd: r.cwd, input: r.push(r.base, runtime) + r.push(docs, runtime) }).mode).toBe('full');
    expect(plan({ cwd: r.cwd, input: r.push(runtime, '0'.repeat(40)) }).mode).toBe('skip');
    r.write('store/new.ts', 'staged');
    r.git('add', 'store/new.ts');
    expect(plan({ cwd: r.cwd, input: r.push(runtime) }).mode).toBe('full');
  });
  it('rejects a non-HEAD runtime hidden by a rename to a documentation path', () => {
    const r = repository();
    r.git('mv', 'pages/index.vue', 'README.md');
    r.commit();
    expect(() => plan({ cwd: r.cwd, input: r.push(r.base, r.base) })).toThrow('Pushed runtime differs');
  });
  it('fails closed for missing refs/base and dirty checkout pushing another head', () => {
    const r = repository();
    expect(() => plan({ cwd: r.cwd })).toThrow('Missing push refs');
    expect(() => plan({ cwd: r.cwd, input: 'bad' })).toThrow('Invalid pre-push');
    r.write('README.md', 'dirty');
    r.commit();
    r.write('README.md', 'dirty again');
    expect(() => plan({ cwd: r.cwd, input: r.push(r.base, r.base) })).toThrow('Dirty checkout');
    r.git('update-ref', '-d', 'refs/remotes/origin/main');
    expect(() => plan({ cwd: r.cwd, input: r.push('0'.repeat(40)) })).toThrow();
  });
  it('runs targeted/full visual commands and propagates failures without invoking screenshots for skips', () => {
    const calls: string[][] = [];
    const run = (args: string[]) => {
      calls.push(args);
      return { status: 7 };
    };
    expect(runSelection({ mode: 'skip' }, { platform: 'darwin', run })).toBe(0);
    expect(calls).toHaveLength(0);
    expect(runSelection({ mode: 'targeted', tests: ['product', 'cart'] }, { platform: 'darwin', run })).toBe(7);
    expect(calls[0]).toEqual([
      'test:visual',
      '--grep',
      'product detail preserves its purchase controls|populated cart preserves checkout entry',
    ]);
    runSelection({ mode: 'full' }, { platform: 'darwin', run });
    expect(calls[1]).toEqual(['test:visual']);
  });
});

it('runs the real hook with captured push stdin and stops before visuals when verify fails', () => {
  const r = repository();
  const sourceRoot = process.cwd();
  r.write('README.md', 'nonvisual');
  r.commit();
  r.write('scripts/select-visual-checks.mjs', readFileSync(join(sourceRoot, 'scripts/select-visual-checks.mjs'), 'utf8'));
  const bin = mkdtempSync(join(tmpdir(), 'visual-hook-bin-'));
  roots.push(bin);
  const log = join(bin, 'calls');
  const fakePnpm = join(bin, 'pnpm');
  writeFileSync(fakePnpm, '#!/bin/sh\necho "$*" >> "$VISUAL_HOOK_LOG"\nexit "${VISUAL_HOOK_EXIT:-0}"\n', { mode: 0o755 });
  const hook = readFileSync(join(sourceRoot, '.husky/pre-push'), 'utf8');
  const execute = (code: string) =>
    spawnSync('sh', ['-c', hook, 'pre-push', 'origin'], {
      cwd: r.cwd,
      input: r.push(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, VISUAL_HOOK_LOG: log, VISUAL_HOOK_EXIT: code },
    });
  expect(execute('0').status).toBe(0);
  expect(readFileSync(log, 'utf8')).toBe('verify\n');
  r.write('pages/index.vue', '<div>visible change</div>');
  r.commit();
  expect(execute('9').status).toBe(9);
  expect(readFileSync(log, 'utf8')).toBe('verify\nverify\n');
  const fingerprint = plan({ cwd: r.cwd, input: r.push() }).decisions[0]!.fingerprint;
  r.write(
    assessmentPath,
    JSON.stringify({
      assessments: [{ fingerprint, impact: 'targeted', reason: 'Home rendering', consumers: 'Homepage', tests: ['home'] }],
    }),
  );
  r.commit();
  expect(execute('0').status).toBe(0);
  const calls = readFileSync(log, 'utf8');
  expect(calls).toBe(
    process.platform === 'darwin'
      ? 'verify\nverify\nverify\ntest:visual --grep homepage preserves header and merchandising\n'
      : 'verify\nverify\nverify\n',
  );
});
