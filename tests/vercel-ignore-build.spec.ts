import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = resolve('scripts/vercel-ignore-build.sh');
const SKIP = 0;
const BUILD = 1;

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'vercel-ignore-build-'));
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
  const decide = (previousSha?: string) => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH };
    if (previousSha !== undefined) env.VERCEL_GIT_PREVIOUS_SHA = previousSha;
    const result = spawnSync('bash', [script], { cwd, env, encoding: 'utf8' });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  };
  write('pages/index.vue', '<div>shop</div>');
  write('chart-designs/progressBar.json', '{}');
  write('docs/guide.md', 'v1');
  const base = commit();
  return { write, commit, decide, base };
}

describe('Vercel ignored build step', () => {
  it('builds a same-commit redeployment so environment changes can take effect', () => {
    const repo = repository();
    expect(repo.decide(repo.base).status).toBe(BUILD);
  });

  it('builds the first deployment of a branch and when the previous deployment is not in the clone', () => {
    const repo = repository();
    expect(repo.decide().status).toBe(BUILD);
    expect(repo.decide('').status).toBe(BUILD);
    expect(repo.decide('0123456789abcdef0123456789abcdef01234567').status).toBe(BUILD);

    // A new branch whose tip commit only touches docs still carries earlier app changes.
    repo.write('pages/index.vue', '<div>new</div>');
    repo.commit();
    repo.write('docs/guide.md', 'v2');
    repo.commit();
    expect(repo.decide().status).toBe(BUILD);
  });

  it('skips when only docs, tests, CI or agent harness files changed since the last deployment', () => {
    const repo = repository();
    repo.write('docs/guide.md', 'v2');
    repo.write('tests/cart.spec.ts', 'test');
    repo.write('.factory/factory.yaml', 'mode: build');
    repo.write('.github/workflows/ci.yml', 'name: CI');
    repo.write('feature_list.json', '[]');
    repo.write('components/README.md', 'notes');
    repo.commit();
    const decision = repo.decide(repo.base);
    expect(decision.status).toBe(SKIP);
    expect(decision.output).toContain('skipping');
  });

  it('builds when any app file changed, alone or next to docs', () => {
    const app = repository();
    app.write('pages/index.vue', '<div>new</div>');
    app.commit();
    expect(app.decide(app.base).status).toBe(BUILD);

    const mixed = repository();
    mixed.write('docs/guide.md', 'v2');
    mixed.write('server/api/products.ts', 'export default 1');
    mixed.commit();
    expect(mixed.decide(mixed.base).status).toBe(BUILD);
  });

  it('builds for chart-designs because the app imports it', () => {
    const repo = repository();
    repo.write('chart-designs/progressBar.json', '{"steps":3}');
    repo.commit();
    expect(repo.decide(repo.base).status).toBe(BUILD);
  });

  it('compares against the last deployed commit, not only the newest commit', () => {
    const repo = repository();
    repo.write('pages/index.vue', '<div>new</div>');
    const appCommit = repo.commit();
    repo.write('docs/guide.md', 'v2');
    repo.commit();
    // The tip only touches docs, but the app changed since a deployment at `base`.
    expect(repo.decide(repo.base).status).toBe(BUILD);
    // Once `appCommit` is deployed, the docs-only tip can be skipped.
    expect(repo.decide(appCommit).status).toBe(SKIP);
  });
});
