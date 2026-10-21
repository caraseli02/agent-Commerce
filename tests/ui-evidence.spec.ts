import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assessPrTemplate, checkPushTemplates } from '../scripts/check-pr-template.mjs';
import { plan } from '../scripts/select-visual-checks.mjs';
import { checkEvidencePush, screenshotMarker, uiDiff, uiPath } from '../scripts/ui-evidence.mjs';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'ui-evidence-'));
  roots.push(cwd);
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  const write = (file: string, content: string) => {
    mkdirSync(join(cwd, file, '..'), { recursive: true });
    writeFileSync(join(cwd, file), content);
  };
  const commit = (message = 'fixture') => {
    git('add', '-A');
    git('commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  write('app/pages/index.vue', '<div>original</div>');
  write('server/api/items.ts', 'original');
  const base = commit();
  git('update-ref', 'refs/remotes/origin/main', base);
  return { cwd, git, write, commit, base };
}

// The real template with every box checked, so only the screenshot rule decides.
const template = readFileSync('.github/pull_request_template.md', 'utf8')
  .replaceAll('- [ ]', '- [x]')
  .replaceAll('— outcome:', '— outcome: pass');
const fingerprint = 'f'.repeat(64);
const image = (side: string) => `<img src="https://github.com/o/r/blob/${'c'.repeat(40)}/b/${side}.png?raw=true" width="420">`;
const withScreenshots = (section: string) => template.replace(/## Screenshots[\s\S]*?(?=\n## )/, `## Screenshots\n\n${section}\n`);
const captured = (marker = fingerprint) =>
  withScreenshots(
    `${screenshotMarker(marker)}\n\n| | Before | After |\n| --- | --- | --- |\n| light · desktop | ${image('before')} | ${image('after')} |`,
  );

describe('UI screenshot evidence', () => {
  it('treats app, public and UI config files as visible and everything else as not', () => {
    for (const path of ['app/pages/index.vue', 'app/assets/css/main.css', 'public/logo.svg', 'nuxt.config.ts', 'tailwind.config.js']) {
      expect(uiPath(path), path).toBe(true);
    }
    for (const path of ['server/api/items.ts', 'scripts/verify.mjs', 'docs/adr/0002.md', 'tests/cart.spec.ts', 'app/utils/price.spec.ts']) {
      expect(uiPath(path), path).toBe(false);
    }
  });

  it('fingerprints only the PR’s UI diff, so merging main keeps it and editing the UI changes it', () => {
    const r = repository();
    r.git('checkout', '-qb', 'topic');
    r.write('server/api/items.ts', 'server only');
    r.commit();
    expect(uiDiff({ cwd: r.cwd }).fingerprint).toBeNull();

    r.write('app/pages/index.vue', '<div>new</div>');
    r.commit();
    const first = uiDiff({ cwd: r.cwd });
    expect(first.files).toEqual(['app/pages/index.vue']);
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/);

    r.git('checkout', '-q', 'main');
    r.write('app/layouts/default.vue', '<slot />');
    const main = r.commit('main moves on');
    r.git('update-ref', 'refs/remotes/origin/main', main);
    r.git('checkout', '-q', 'topic');
    r.git('merge', '-q', '--no-edit', 'main');
    expect(uiDiff({ cwd: r.cwd }).fingerprint).toBe(first.fingerprint);

    r.write('app/pages/index.vue', '<div>newer</div>');
    r.commit();
    expect(uiDiff({ cwd: r.cwd }).fingerprint).not.toBe(first.fingerprint);
  });

  it('requires a current before/after section, or a reason, when UI files changed', () => {
    const ui = { fingerprint };
    expect(assessPrTemplate({ body: template, ui: { fingerprint: null } }).status).toBe('passed');
    expect(assessPrTemplate({ body: template.replace(/## Screenshots[\s\S]*?(?=\n## )/, ''), ui }).violations.join(' ')).toContain(
      'section is missing',
    );
    expect(assessPrTemplate({ body: template, ui }).violations.join(' ')).toContain('no pr-screenshots marker');
    expect(assessPrTemplate({ body: captured('e'.repeat(64)), ui }).violations.join(' ')).toContain('stale');
    expect(assessPrTemplate({ body: withScreenshots(screenshotMarker(fingerprint)), ui }).violations.join(' ')).toContain('image pair');
    expect(assessPrTemplate({ body: captured(), ui }).status).toBe('passed');
    expect(assessPrTemplate({ body: withScreenshots('No visible change: dark token only reaches print styles'), ui }).status).toBe(
      'passed',
    );
    expect(assessPrTemplate({ body: withScreenshots('No visible change: n/a'), ui }).status).toBe('failed');
  });

  it('checks the live body of an open PR against the pushed head before push', () => {
    const input = `refs/heads/topic ${'a'.repeat(40)} refs/heads/topic ${'b'.repeat(40)}\n`;
    const run = () => JSON.stringify([{ number: 7, body: template, labels: [] }]);
    expect(() => checkPushTemplates(input, { run, uiFingerprint: () => fingerprint })).toThrow('PR #7');
    expect(() => checkPushTemplates(input, { run, uiFingerprint: () => null })).not.toThrow();
    const evidence = `refs/heads/pr-evidence ${'a'.repeat(40)} refs/heads/pr-evidence ${'0'.repeat(40)}\n`;
    expect(() =>
      checkPushTemplates(evidence, {
        run: () => {
          throw new Error('evidence pushes must not query PRs');
        },
      }),
    ).not.toThrow();
  });

  it('lets pr-evidence only gain PNG files and skips the visual suite for it', () => {
    const r = repository();
    const zero = '0'.repeat(40);
    r.git('checkout', '-q', '--orphan', 'pr-evidence');
    r.git('rm', '-rqf', '.');
    r.write('topic/abc/home-light-desktop-before.png', 'png');
    const first = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: first, remoteSha: zero })).not.toThrow();
    expect(plan({ cwd: r.cwd, input: `refs/heads/x ${first} refs/heads/pr-evidence ${zero}\n` }).mode).toBe('skip');

    r.write('topic/abc/notes.md', 'not an image');
    const text = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: text, remoteSha: first })).toThrow('only added .png');

    r.git('reset', '-q', '--hard', first);
    r.git('rm', '-q', 'topic/abc/home-light-desktop-before.png');
    const removal = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: removal, remoteSha: first })).toThrow('only added .png');

    r.git('checkout', '-q', '--orphan', 'rewrite');
    r.write('other.png', 'png');
    const unrelated = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: unrelated, remoteSha: first })).toThrow('append-only');
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: zero, remoteSha: first })).toThrow('append-only');
  });
});
