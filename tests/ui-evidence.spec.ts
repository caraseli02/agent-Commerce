import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assessPrTemplate, checkPushTemplates } from '../scripts/check-pr-template.mjs';
import { plan } from '../scripts/select-visual-checks.mjs';
import { checkEvidencePush, evidenceVercelConfig, screenshotMarker, shotName, uiDiff, uiPath } from '../scripts/ui-evidence.mjs';

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
const image = (side: string) => `<img src="https://github.com/o/r/blob/${'c'.repeat(40)}/b/${side}.jpg?raw=true" width="420">`;
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

  it('keeps the fingerprint when main edits other lines of the same UI file, and changes it on a PR line edit', () => {
    const r = repository();
    const lines = Array.from({ length: 30 }, (_, index) => `<p>line ${index + 1}</p>`);
    const file = (edits: Record<number, string>) => `${lines.map((line, index) => edits[index] ?? line).join('\n')}\n`;
    r.write('app/components/Long.vue', file({}));
    r.write('public/logo.png', 'binary\0v1');
    const base = r.commit('long file');
    r.git('update-ref', 'refs/remotes/origin/main', base);

    r.git('checkout', '-qb', 'topic');
    r.write('app/components/Long.vue', file({ 0: '<p>PR edit</p>' }));
    r.write('public/logo.png', 'binary\0v2');
    r.commit('PR edits line 1 and the logo');
    const first = uiDiff({ cwd: r.cwd }).fingerprint;

    r.git('checkout', '-q', 'main');
    r.write('app/components/Long.vue', file({ 29: '<p>main edit</p>' }));
    const main = r.commit('main edits line 30');
    r.git('update-ref', 'refs/remotes/origin/main', main);
    r.git('checkout', '-q', 'topic');
    r.git('merge', '-q', '--no-edit', 'main');
    expect(r.git('show', 'HEAD:app/components/Long.vue')).toContain('main edit');
    expect(uiDiff({ cwd: r.cwd }).fingerprint).toBe(first);

    r.write('public/logo.png', 'binary\0v3');
    r.commit('PR edits the logo again');
    const binaryEdit = uiDiff({ cwd: r.cwd }).fingerprint;
    expect(binaryEdit).not.toBe(first);

    r.write('app/components/Long.vue', file({ 0: '<p>PR edit, revised</p>', 29: '<p>main edit</p>' }));
    r.commit('PR revises its line');
    expect(uiDiff({ cwd: r.cwd }).fingerprint).not.toBe(binaryEdit);
  });

  it('changes the fingerprint when the same edit moves to another copy of a repeated line', () => {
    const r = repository();
    const page = (header: string, product: string) =>
      `<header>\n  <span>${header}</span>\n</header>\n<article>\n  <span>${product}</span>\n</article>\n`;
    r.write('app/components/Buy.vue', page('Buy', 'Buy'));
    const base = r.commit('two identical controls');
    r.git('update-ref', 'refs/remotes/origin/main', base);

    r.git('checkout', '-qb', 'topic');
    r.write('app/components/Buy.vue', page('Add to cart', 'Buy'));
    r.commit('PR edits the header control');
    const header = uiDiff({ cwd: r.cwd }).fingerprint;

    r.write('app/components/Buy.vue', page('Buy', 'Add to cart'));
    r.commit('PR moves the edit to the product control');
    const product = uiDiff({ cwd: r.cwd }).fingerprint;
    expect(product).not.toBe(header);
    expect(assessPrTemplate({ body: captured(header), ui: { fingerprint: product } }).violations.join(' ')).toContain('stale');
  });

  it('changes the fingerprint when a pure insertion moves between repeated controls', () => {
    const r = repository();
    const page = (afterHeader: string, afterProduct: string) =>
      `<header>\n  <span>Buy</span>\n${afterHeader}</header>\n<article>\n  <span>Buy</span>\n${afterProduct}</article>\n`;
    const added = '  <button>Add to cart</button>\n';
    r.write('app/components/Buy.vue', page('', ''));
    const base = r.commit('two identical controls');
    r.git('update-ref', 'refs/remotes/origin/main', base);

    r.git('checkout', '-qb', 'topic');
    r.write('app/components/Buy.vue', page(added, ''));
    r.commit('PR adds a button to the header');
    const header = uiDiff({ cwd: r.cwd }).fingerprint;

    r.write('app/components/Buy.vue', page('', added));
    r.commit('PR moves the button to the product');
    const product = uiDiff({ cwd: r.cwd }).fingerprint;
    expect(product).not.toBe(header);
    expect(assessPrTemplate({ body: captured(header), ui: { fingerprint: product } }).violations.join(' ')).toContain('stale');
  });

  it('keeps pure-insertion relocation detectable in files whose names Git quotes', () => {
    const r = repository();
    const page = (afterHeader: string, afterProduct: string) =>
      `<header>\n  <span>Buy</span>\n${afterHeader}</header>\n<article>\n  <span>Buy</span>\n${afterProduct}</article>\n`;
    const added = '  <button>Add to cart</button>\n';
    const path = 'app/components/Caf\u00e9.vue';
    r.write(path, page('', ''));
    r.git('update-ref', 'refs/remotes/origin/main', r.commit('two identical controls'));

    r.git('checkout', '-qb', 'topic');
    r.write(path, page(added, ''));
    r.commit('PR adds a button to the header');
    const header = uiDiff({ cwd: r.cwd }).fingerprint;

    r.write(path, page('', added));
    r.commit('PR moves the button to the product');
    const product = uiDiff({ cwd: r.cwd }).fingerprint;
    expect(product).not.toBe(header);
    expect(assessPrTemplate({ body: captured(header), ui: { fingerprint: product } }).violations.join(' ')).toContain('stale');
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

  it('lets pr-evidence only gain screenshots, keeps Vercel off and skips the visual suite for it', () => {
    const r = repository();
    const zero = '0'.repeat(40);
    r.git('checkout', '-q', '--orphan', 'pr-evidence');
    r.git('rm', '-rqf', '.');
    r.write('topic/abc/home-light-desktop-before.jpg', 'jpg');
    const withoutConfig = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: withoutConfig, remoteSha: zero })).toThrow('vercel.json');

    r.write('vercel.json', evidenceVercelConfig);
    const first = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: first, remoteSha: zero })).not.toThrow();
    expect(plan({ cwd: r.cwd, input: `refs/heads/x ${first} refs/heads/pr-evidence ${zero}\n` }).mode).toBe('skip');

    r.write('topic/abc/home-dark-mobile-after.png', 'png');
    const more = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: more, remoteSha: first })).not.toThrow();

    r.write('topic/abc/notes.md', 'not an image');
    const text = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: text, remoteSha: more })).toThrow('only added screenshots');

    r.git('reset', '-q', '--hard', more);
    r.git('rm', '-q', 'topic/abc/home-light-desktop-before.jpg');
    const removal = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: removal, remoteSha: more })).toThrow('only added screenshots');

    r.git('reset', '-q', '--hard', more);
    r.write('vercel.json', '{}');
    const enabled = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: enabled, remoteSha: more })).toThrow('only added screenshots');

    r.git('checkout', '-q', '--orphan', 'rewrite');
    r.write('other/x.png', 'png');
    const unrelated = r.commit();
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: unrelated, remoteSha: more })).toThrow('append-only');
    expect(() => checkEvidencePush({ cwd: r.cwd, localSha: zero, remoteSha: more })).toThrow('append-only');
  });

  it("names every route's screenshots apart, even when their slugs collide", () => {
    const routes = ['/search?keyword=a.b', '/search?keyword=a-b', '/'];
    const names = routes.flatMap((route) => ['light', 'dark'].map((scheme) => shotName(route, scheme, 'desktop')));
    expect(new Set(names).size).toBe(names.length);
    expect(shotName('/search?keyword=a.b', 'light', 'desktop')).toBe(shotName('/search?keyword=a.b', 'light', 'desktop'));
    for (const name of names) expect(`topic/abc/${name}-before.jpg`).toMatch(/^[\w.-]+(\/[\w.-]+)+\.(png|jpg)$/);
  });

  it.each([
    ['an unknown role', ['--sign-in', 'guest']],
    ['an inherited property', ['--sign-in', 'constructor']],
    ['an empty role', ['--sign-in=']],
    ['a missing role', ['--sign-in']],
  ])('refuses %s for --sign-in before building anything', (_, signIn) => {
    const r = repository();
    const result = spawnSync(process.execPath, [resolve('scripts/pr-screenshots.mjs'), '--routes', '/dashboard/client', ...signIn], {
      cwd: r.cwd,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--sign-in takes customer or admin.');
    expect(r.git('worktree', 'list', '--porcelain').match(/^worktree /gm)).toHaveLength(1);
  });

  it('removes its temporary worktree when installing a side fails', () => {
    const r = repository();
    const bin = mkdtempSync(join(tmpdir(), 'pr-screenshots-bin-'));
    roots.push(bin);
    writeFileSync(join(bin, 'pnpm'), '#!/bin/sh\nexit 9\n');
    chmodSync(join(bin, 'pnpm'), 0o755);
    const result = spawnSync(process.execPath, [resolve('scripts/pr-screenshots.mjs'), '--routes', '/', '--no-push'], {
      cwd: r.cwd,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
    const kept = result.stdout.match(/Screenshots kept in (.+)\/shots/)?.[1];
    if (kept) roots.push(kept);
    expect(result.status).toBe(1);
    expect(r.git('worktree', 'list', '--porcelain').match(/^worktree /gm)).toHaveLength(1);
  });

  it('stops the first preview and removes both worktrees when the second preview fails to start', async () => {
    const r = repository();
    const bin = mkdtempSync(join(tmpdir(), 'pr-screenshots-bin-'));
    roots.push(bin);
    // Install succeeds; build writes a preview that listens on its owner's socket on the "before" side and exits 9 on "after".
    const before = "import { createServer } from 'node:http'; createServer((q, s) => s.end('ok')).listen(process.env.NITRO_UNIX_SOCKET);";
    writeFileSync(
      join(bin, 'pnpm'),
      `#!/bin/sh\n[ "$1" = build ] || exit 0\nmkdir -p .output/server\nif [ "$(basename "$PWD")" = before ]; then echo "${before}" > .output/server/index.mjs; else echo "process.exit(9);" > .output/server/index.mjs; fi\n`,
    );
    chmodSync(join(bin, 'pnpm'), 0o755);
    const port = 41000 + Math.floor(Math.random() * 2000);
    const result = spawnSync(
      process.execPath,
      [resolve('scripts/pr-screenshots.mjs'), '--routes', '/', '--no-push', '--port', String(port)],
      {
        cwd: r.cwd,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        // A leaked preview keeps the stderr pipe open; fail instead of hanging the suite.
        timeout: 60_000,
      },
    );
    const kept = result.stdout.match(/Screenshots kept in (.+)\/shots/)?.[1];
    if (kept) roots.push(kept);
    expect(result.stderr).toContain(`Owned server on port ${port + 1} exited (9) before it answered.`);
    expect(result.status).toBe(1);
    await expect(fetch(`http://127.0.0.1:${port}`)).rejects.toThrow();
    expect(r.git('worktree', 'list', '--porcelain').match(/^worktree /gm)).toHaveLength(1);
  });
});
