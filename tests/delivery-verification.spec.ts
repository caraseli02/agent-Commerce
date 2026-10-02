import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync, symlinkSync, utimesSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  documentationChanges,
  documentationPath,
  inputFingerprint,
  recordReceipt,
  reusableReceipt,
  receiptPath,
  verificationEnvironment,
  assertPushedCheckout,
} from '../scripts/verification-evidence.mjs';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'delivery-verification-'));
  roots.push(cwd);
  const env = verificationEnvironment(process.env);
  delete env.CI;
  const git = (...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'core.hooksPath', '/dev/null');
  git('config', 'commit.gpgsign', 'false');
  const write = (file: string, content: string) => {
    mkdirSync(join(cwd, file, '..'), { recursive: true });
    writeFileSync(join(cwd, file), content);
  };
  const commit = () => {
    git('add', '.');
    git('commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  write('.gitignore', 'tmp/\nnode_modules/\n.output/\n.nuxt/\n.env\n');
  write('server/payment.ts', 'export const status = "PAID";');
  write('pnpm-lock.yaml', 'version: 1');
  write('README.md', '# Fixture\n');
  write('node_modules/.pnpm/lock.yaml', 'version: 1');
  write('.output/server/index.mjs', 'export const built = true;');
  write('.nuxt/tsconfig.json', '{}');
  const base = commit();
  return { cwd, env, git, write, commit, base };
}

describe('delivery evidence and documentation selection', () => {
  it('keeps executable tooling, tests, dependencies, and unknown paths in the full gate', () => {
    for (const file of ['README.md', 'feature_list.json', 'docs/agents/verification.md', '.agents/skills/qa/SKILL.md'])
      expect(documentationPath(file)).toBe(true);
    for (const file of [
      'server/payment.ts',
      'scripts/verify.mjs',
      'tests/payment.spec.ts',
      '.github/workflows/ci.yml',
      'pnpm-lock.yaml',
      'public/help.md',
      'docs/fixture.json',
      '.agents/skills/qa/run.js',
      '.visual-impact.json',
    ])
      expect(documentationPath(file)).toBe(false);
  });
  it('uses the complete range rather than its final documentation commit', () => {
    const r = repository();
    r.write('server/payment.ts', 'changed runtime');
    r.commit();
    r.write('README.md', '# Updated\n');
    r.commit();
    expect(documentationChanges(r.cwd, r.base)).toBeNull();
    const runtime = r.git('rev-parse', 'HEAD~1');
    expect(documentationChanges(r.cwd, runtime)).toEqual(['README.md']);
  });
  it('rejects source renames to documentation, dirty/untracked source, and missing bases', () => {
    const r = repository();
    r.git('mv', 'server/payment.ts', 'docs-payment.md');
    r.commit();
    expect(documentationChanges(r.cwd, r.base)).toBeNull();
    r.write('README.md', '# Changed\n');
    const before = r.git('rev-parse', 'HEAD');
    r.commit();
    r.write('server/untracked.ts', 'new source');
    expect(documentationChanges(r.cwd, before)).toBeNull();
    r.git('add', 'server/untracked.ts');
    expect(documentationChanges(r.cwd, before)).toBeNull();
    expect(documentationChanges(r.cwd, 'unavailable')).toBeNull();
  });
  it('does not treat empty ranges, executable Markdown, or symlinks as documentation-only', () => {
    const r = repository();
    expect(documentationChanges(r.cwd, r.base)).toBeNull();
    r.write('README.md', '# Executable\n');
    chmodSync(join(r.cwd, 'README.md'), 0o755);
    r.commit();
    expect(documentationChanges(r.cwd, r.base)).toBeNull();
    chmodSync(join(r.cwd, 'README.md'), 0o644);
    r.commit();
    symlinkSync('server/payment.ts', join(r.cwd, 'PROGRESS.md'));
    r.commit();
    expect(documentationChanges(r.cwd, r.base)).toBeNull();
  });
  it('blocks testing a different executable head from the current checkout', () => {
    const r = repository();
    r.write('server/payment.ts', 'changed');
    r.commit();
    expect(() => documentationChanges(r.cwd, r.base, r.base)).toThrow('Pushed executable inputs differ');
  });
  it('requires the exact clean pushed checkout even for tracking-only changes', () => {
    const r = repository();
    expect(() => assertPushedCheckout(r.cwd, r.base)).not.toThrow();
    r.write('README.md', '# Dirty tracking\n');
    expect(() => assertPushedCheckout(r.cwd, r.base)).toThrow('clean checkout');
    r.commit();
    expect(() => assertPushedCheckout(r.cwd, r.base)).toThrow('own checkout');
  });
  it('reuses successful matching evidence across tracking edits but not source edits or untracked tests', () => {
    const r = repository();
    const fingerprint = inputFingerprint(r.cwd, r.env);
    expect(fingerprint).toBeTypeOf('string');
    recordReceipt(r.cwd, fingerprint, r.env);
    expect(reusableReceipt(r.cwd, fingerprint, r.env)).toBe(true);
    r.write('PROGRESS.md', '# New handoff\n');
    r.commit();
    expect(inputFingerprint(r.cwd, r.env)).toBe(fingerprint);
    r.write('server/payment.ts', 'changed');
    expect(reusableReceipt(r.cwd, inputFingerprint(r.cwd, r.env), r.env)).toBe(false);
    r.write('server/payment.ts', 'export const status = "PAID";');
    r.write('tests/new.spec.ts', 'new test');
    expect(reusableReceipt(r.cwd, inputFingerprint(r.cwd, r.env), r.env)).toBe(false);
  });
  it('invalidates evidence for dependencies, environment, and ignored local configuration', () => {
    const r = repository();
    const original = inputFingerprint(r.cwd, r.env);
    recordReceipt(r.cwd, original, r.env);
    expect(inputFingerprint(r.cwd, { ...r.env, DATABASE_URL: 'different-environment' })).not.toBe(original);
    r.write('.env', 'NUXT_PUBLIC_MOCK_MODE=true');
    expect(inputFingerprint(r.cwd, r.env)).not.toBe(original);
    rmSync(join(r.cwd, '.env'));
    r.write('pnpm-lock.yaml', 'version: 2');
    expect(inputFingerprint(r.cwd, r.env)).not.toBe(original);
    r.write('pnpm-lock.yaml', 'version: 1');
    r.write('node_modules/.pnpm/lock.yaml', 'version: 2');
    expect(inputFingerprint(r.cwd, r.env)).not.toBe(original);
  });
  it('preserves evidence for Husky duplicate PATH entries while detecting a new executable search directory', () => {
    const r = repository();
    mkdirSync(join(r.cwd, 'node_modules/.bin'), { recursive: true });
    const env = { ...r.env, PATH: `${join(r.cwd, 'node_modules/.bin')}:${r.env.PATH}` };
    const fingerprint = inputFingerprint(r.cwd, env);
    expect(inputFingerprint(r.cwd, { ...env, PATH: `node_modules/.bin:${env.PATH}` })).toBe(fingerprint);
    const gitExecPath = r.git('--exec-path');
    expect(inputFingerprint(r.cwd, { ...env, PATH: `${gitExecPath}:${env.PATH}` })).toBe(fingerprint);
    expect(inputFingerprint(r.cwd, { ...env, PATH: `/new/search/directory:${env.PATH}` })).not.toBe(fingerprint);
  });
  it('ignores first-run dependency caches while detecting changed installation anchors', () => {
    const r = repository();
    r.write('node_modules/.modules.yaml', 'installed: true');
    const original = inputFingerprint(r.cwd, r.env);
    recordReceipt(r.cwd, original, r.env);
    for (const file of ['node_modules/.cache/build/result', 'node_modules/.vite/results.json', 'node_modules/.pnpm/.cache/result'])
      r.write(file, 'generated cache');
    expect(inputFingerprint(r.cwd, r.env)).toBe(original);
    expect(reusableReceipt(r.cwd, inputFingerprint(r.cwd, r.env), r.env)).toBe(true);
    const anchor = join(r.cwd, 'node_modules/.modules.yaml');
    const stat = statSync(anchor);
    utimesSync(anchor, stat.atime, new Date(stat.mtimeMs + 1000));
    expect(inputFingerprint(r.cwd, r.env)).not.toBe(original);
    r.write('node_modules/.modules.yaml', 'installed: changed');
    expect(inputFingerprint(r.cwd, r.env)).not.toBe(original);
  });
  it('excludes only internal skill alias content and includes unexpected source and external targets', () => {
    const r = repository();
    r.write('.agents/skills/qa/SKILL.md', '# Skill');
    mkdirSync(join(r.cwd, 'skills'));
    symlinkSync('../.agents/skills/qa', join(r.cwd, 'skills/qa'));
    r.commit();
    const original = inputFingerprint(r.cwd, r.env);
    r.write('.agents/skills/qa/SKILL.md', '# Updated skill');
    expect(inputFingerprint(r.cwd, r.env)).toBe(original);
    for (const file of ['skills/unexpected.js', '.claude/skills/unexpected.js', '.agents/skills/qa/run.js']) {
      r.write(file, 'first');
      const before = inputFingerprint(r.cwd, r.env);
      expect(before).not.toBe(original);
      r.write(file, 'changed');
      expect(inputFingerprint(r.cwd, r.env)).not.toBe(before);
      rmSync(join(r.cwd, file));
    }
    symlinkSync('../server', join(r.cwd, 'skills/external'));
    const before = inputFingerprint(r.cwd, r.env);
    r.write('server/payment.ts', 'external target changed');
    expect(inputFingerprint(r.cwd, r.env)).not.toBe(before);
  });
  it('requires fresh CI and refuses expired, future, malformed, and missing receipts', () => {
    const r = repository();
    const fingerprint = inputFingerprint(r.cwd, r.env);
    expect(reusableReceipt(r.cwd, fingerprint, r.env)).toBe(false);
    recordReceipt(r.cwd, fingerprint, r.env);
    const receipt = JSON.parse(readFileSync(join(r.cwd, receiptPath), 'utf8'));
    expect(reusableReceipt(r.cwd, fingerprint, { ...r.env, CI: 'true' })).toBe(false);
    expect(reusableReceipt(r.cwd, fingerprint, r.env, receipt.completedAt + 4 * 60 * 60 * 1000)).toBe(false);
    expect(reusableReceipt(r.cwd, fingerprint, r.env, receipt.completedAt - 1)).toBe(false);
    r.write(receiptPath, '{invalid');
    expect(reusableReceipt(r.cwd, fingerprint, r.env)).toBe(false);
  });
  it('invalidates evidence when generated artifacts change or disappear', () => {
    const r = repository();
    const fingerprint = inputFingerprint(r.cwd, r.env);
    recordReceipt(r.cwd, fingerprint, r.env);
    r.write('.output/server/index.mjs', 'changed build');
    expect(reusableReceipt(r.cwd, fingerprint, r.env)).toBe(false);
    recordReceipt(r.cwd, fingerprint, r.env);
    rmSync(join(r.cwd, '.nuxt/tsconfig.json'));
    expect(reusableReceipt(r.cwd, fingerprint, r.env)).toBe(false);
  });
  it('removes hook-local Git redirection without removing application configuration', () => {
    expect(
      verificationEnvironment({
        GIT_DIR: '/different/repository',
        GIT_INDEX_FILE: '/different/index',
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'core.bare',
        GIT_CONFIG_VALUE_0: 'true',
        DATABASE_URL: 'configured',
      }),
    ).toEqual({ DATABASE_URL: 'configured' });
  });
});

it('runs the real gate, reuses only base checks, and discards evidence after failure', () => {
  const r = repository();
  for (const file of ['verify.mjs', 'verification-evidence.mjs'])
    r.write(`scripts/${file}`, readFileSync(join(process.cwd(), 'scripts', file), 'utf8'));
  for (const file of ['check-bundle-size.mjs', 'verify-ui-conventions.mjs']) r.write(`scripts/${file}`, 'process.exit(0);');
  r.write('scripts/validate-feature-list.sh', '#!/bin/sh\nexit "${VALIDATOR_EXIT:-0}"\n');
  r.write(
    'bin/pnpm',
    '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 10.18.3; exit 0; fi\nif [ "$1" = "build" ]; then mkdir -p node_modules/.cache/build node_modules/.pnpm/.cache; fi\nprintf "%s\\n" "$*" >> "$GATE_LOG"\nif [ "$1" = "test:coverage" ]; then if [ "$CHANGE_INPUT" = "1" ]; then printf "changed" >> server/payment.ts; fi; exit "${TEST_EXIT:-0}"; fi\n',
  );
  chmodSync(join(r.cwd, 'bin/pnpm'), 0o755);
  r.commit();
  const log = join(r.cwd, 'tmp/calls');
  mkdirSync(join(r.cwd, 'tmp'), { recursive: true });
  const env = { ...r.env, PATH: `${join(r.cwd, 'bin')}:${r.env.PATH}`, GATE_LOG: log };
  const execute = (args: string[] = [], extra = {}) =>
    spawnSync(process.execPath, ['scripts/verify.mjs', ...args], { cwd: r.cwd, env: { ...env, ...extra }, encoding: 'utf8' });
  expect(execute().status).toBe(0);
  expect(execute(['--reuse']).status).toBe(0);
  expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual(['build', 'lint', 'typecheck', 'test:coverage']);
  expect(execute(['--reuse'], { VALIDATOR_EXIT: '7' }).status).toBe(1);
  expect(reusableReceipt(r.cwd, inputFingerprint(r.cwd, env), env)).toBe(false);
  expect(execute(['--fresh'], { TEST_EXIT: '9' }).status).toBe(1);
  expect(reusableReceipt(r.cwd, inputFingerprint(r.cwd, env), env)).toBe(false);
  expect(execute(['--reuse']).status).toBe(0);
  expect(execute(['--reuse'], { CI: 'true' }).status).toBe(0);
  expect(
    readFileSync(log, 'utf8')
      .trim()
      .split('\n')
      .filter((line) => line === 'test:coverage'),
  ).toHaveLength(4);
  const changed = execute(['--fresh'], { CHANGE_INPUT: '1' });
  expect(changed.status).toBe(1);
  expect(changed.stderr).toContain('Verification inputs changed');
  expect(reusableReceipt(r.cwd, inputFingerprint(r.cwd, env), env)).toBe(false);
});

it('runs only focused formatting and state validation for a real documentation-only range in CI', () => {
  const r = repository();
  for (const file of ['verify.mjs', 'verification-evidence.mjs'])
    r.write(`scripts/${file}`, readFileSync(join(process.cwd(), 'scripts', file), 'utf8'));
  r.write('scripts/validate-feature-list.sh', '#!/bin/sh\nexit "${VALIDATOR_EXIT:-0}"\n');
  r.write('bin/pnpm', '#!/bin/sh\nprintf "%s\\n" "$*" >> "$GATE_LOG"\nexit 0\n');
  chmodSync(join(r.cwd, 'bin/pnpm'), 0o755);
  const base = r.commit();
  r.write('README.md', '# Updated\n');
  r.commit();
  mkdirSync(join(r.cwd, 'tmp'), { recursive: true });
  const log = join(r.cwd, 'tmp/calls');
  const env = { ...r.env, CI: 'true', PATH: `${join(r.cwd, 'bin')}:${r.env.PATH}`, GATE_LOG: log };
  const execute = (extra = {}) =>
    spawnSync(process.execPath, ['scripts/verify.mjs', '--base', base], { cwd: r.cwd, env: { ...env, ...extra }, encoding: 'utf8' });
  expect(execute().status).toBe(0);
  expect(readFileSync(log, 'utf8')).toBe('exec prettier --check --ignore-unknown README.md\n');
  expect(execute({ VALIDATOR_EXIT: '9' }).status).toBe(1);
});
