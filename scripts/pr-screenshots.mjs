#!/usr/bin/env node
// Before/after screenshots for a UI PR (run through `pnpm pr:screenshots`, which wraps this in an
// isolated PostgreSQL schema). Builds the merge base with main and the PR head in throwaway
// worktrees, captures each route in light and dark at desktop and mobile widths, stores the PNGs
// on the append-only pr-evidence branch and prints the `## Screenshots` section for the PR body.
// Storage stays small: JPEGs only, pixel-identical pairs are not stored, a run over MAX_BYTES is
// refused, and evidence commits carry a vercel.json that turns Vercel deployments off.
//
//   pnpm pr:screenshots --routes "/,/search?keyword=STM32" [--head <ref>] [--body-out <file>] [--no-push]
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { evidenceBranch, evidenceRef, evidenceVercelConfig, screenshotMarker, shotName, uiDiff } from './ui-evidence.mjs';

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const SCHEMES = ['light', 'dark'];
// Every fetch of the repository downloads pr-evidence, so one run stays under this.
const MAX_BYTES = 2 * 1024 * 1024;

function parseArgs(argv) {
  const options = { head: 'HEAD', push: true, port: 3210, schemes: SCHEMES, viewports: Object.keys(VIEWPORTS) };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split(/=(.*)/s, 2);
    const value = () => inline ?? argv[++i];
    if (flag === '--routes')
      options.routes = value()
        .split(',')
        .map((route) => route.trim())
        .filter(Boolean);
    else if (flag === '--head') options.head = value();
    else if (flag === '--body-out') options.bodyOut = value();
    else if (flag === '--port') options.port = Number(value());
    else if (flag === '--schemes') options.schemes = value().split(',');
    else if (flag === '--viewports') options.viewports = value().split(',');
    else if (flag === '--no-push') options.push = false;
    else throw new Error(`Unknown option ${argv[i]}.`);
  }
  if (!options.routes?.length || options.routes.some((route) => !route.startsWith('/'))) {
    throw new Error('Pass --routes with the comma-separated paths the change affects, for example --routes "/,/search?keyword=STM32".');
  }
  if (options.schemes.some((scheme) => !SCHEMES.includes(scheme))) throw new Error(`--schemes takes ${SCHEMES.join(',')}.`);
  if (options.viewports.some((name) => !VIEWPORTS[name])) throw new Error(`--viewports takes ${Object.keys(VIEWPORTS).join(',')}.`);
  return options;
}

const git = (args, options = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
}

function repoSlug() {
  const url = git(['remote', 'get-url', 'origin']);
  const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`origin is not a GitHub remote: ${url}`);
  return match[1];
}

// One throwaway worktree per side, so the PR checkout and its .output stay untouched. It joins
// `worktrees` as soon as it exists, so a failed install or build still removes it.
function prepare(root, name, sha, worktrees) {
  const dir = join(root, name);
  git(['worktree', 'add', '--detach', dir, sha]);
  worktrees.push(dir);
  for (const file of ['.env', '.env.local']) if (existsSync(file)) copyFileSync(file, join(dir, file));
  process.stdout.write(`\n▶ ${name}: install and build ${sha.slice(0, 7)}\n`);
  run('pnpm', ['install', '--frozen-lockfile', '--prefer-offline', '--reporter=silent'], dir);
  run('pnpm', ['build'], dir);
  return dir;
}

// Registers the preview in `servers` as soon as it is spawned, so a later failure (this preview's
// own timeout, or the next preview failing to start) still stops it.
async function serve(dir, port, servers) {
  const child = spawn(process.execPath, [join(dir, '.output/server/index.mjs')], {
    cwd: dir,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NUXT_PUBLIC_MOCK_MODE: 'true', NUXT_PUBLIC_BASE_URL_API: '/api' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const url = `http://127.0.0.1:${port}`;
  servers.push({ child, url });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Preview on port ${port} exited (${child.exitCode}).`);
    try {
      if ((await fetch(url)).ok) return { child, url };
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview on port ${port} did not answer within 30s.`);
}

// Resolves once the preview has exited, escalating to SIGKILL, so its worktree can be removed.
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
  await exited;
  clearTimeout(timer);
}

async function capture({ browser, url, route, scheme, viewport, file }) {
  const context = await browser.newContext({ colorScheme: scheme, viewport: VIEWPORTS[viewport], locale: 'en-US', timezoneId: 'UTC' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(`${url}${route}`, { waitUntil: 'networkidle' });
  if (!response || response.status() >= 400) errors.push(`HTTP ${response?.status() ?? 'no response'}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, type: 'jpeg', quality: 75, animations: 'disabled', caret: 'hide' });
  await context.close();
  return errors;
}

// Commit the images onto pr-evidence without touching the checkout or its index.
function publish(files, prefix) {
  try {
    git(['fetch', '--quiet', 'origin', `${evidenceRef}:refs/remotes/origin/${evidenceBranch}`]);
  } catch {
    /* first publication creates the branch */
  }
  let parent = '';
  try {
    parent = git(['rev-parse', '--verify', `refs/remotes/origin/${evidenceBranch}^{commit}`]);
  } catch {
    /* no branch yet */
  }
  const index = join(mkdtempSync(join(tmpdir(), 'pr-evidence-index-')), 'index');
  const env = { ...process.env, GIT_INDEX_FILE: index };
  if (parent) git(['read-tree', parent], { env });
  for (const [path, file] of files) {
    const blob = git(['hash-object', '-w', file]);
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${prefix}/${path}`], { env });
  }
  // Vercel reads vercel.json from the pushed commit; without it every evidence push starts a deployment.
  const config = git(['hash-object', '-w', '--stdin'], { input: evidenceVercelConfig, stdio: ['pipe', 'pipe', 'pipe'] });
  git(['update-index', '--add', '--cacheinfo', `100644,${config},vercel.json`], { env });
  const tree = git(['write-tree'], { env });
  const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `evidence: ${prefix}`]);
  // A plain push: the pre-push hook checks that pr-evidence only gains images and keeps vercel.json.
  run('git', ['push', 'origin', `${commit}:${evidenceRef}`]);
  return commit;
}

function section({ ui, base, head, routes, pairs, images }) {
  const lines = ['## Screenshots', ''];
  if (ui.fingerprint) lines.push(screenshotMarker(ui.fingerprint));
  if (!pairs.some((pair) => pair.changed)) {
    lines.push(
      `No visible change: \`pnpm pr:screenshots\` found ${routes.map((route) => `\`${route}\``).join(', ')} pixel-identical before (\`${base.slice(0, 7)}\`) and after (\`${head.slice(0, 7)}\`) in every captured scheme and viewport.`,
    );
    return `${lines.join('\n')}\n`;
  }
  lines.push(
    `Before is the merge base with main (\`${base.slice(0, 7)}\`), after is the PR head (\`${head.slice(0, 7)}\`). Captured by \`pnpm pr:screenshots\` from fresh builds in mock mode; pixel-identical pairs are listed but not stored.`,
  );
  for (const route of routes) {
    lines.push('', `### \`${route}\``, '', '| | Before | After |', '| --- | --- | --- |');
    for (const { scheme, viewport, name, changed } of pairs.filter((pair) => pair.route === route)) {
      const { width, height } = VIEWPORTS[viewport];
      const cell = (side) => `<img src="${images(`${name}-${side}.jpg`)}" width="${viewport === 'mobile' ? 220 : 420}">`;
      const row = changed ? `${cell('before')} | ${cell('after')}` : 'unchanged | unchanged';
      lines.push(`| ${scheme} · ${viewport} ${width}×${height} | ${row} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ui = uiDiff({ head: options.head });
  if (options.head === 'HEAD' && git(['status', '--porcelain'])) {
    throw new Error('Commit or set aside local changes first: the after build is the committed HEAD.');
  }
  if (!ui.files.length) process.stdout.write('Note: this head changes no UI files; screenshots are optional.\n');

  const root = mkdtempSync(join(tmpdir(), 'pr-screenshots-'));
  const shots = join(root, 'shots');
  mkdirSync(shots);
  const servers = [];
  const worktrees = [];
  try {
    const before = prepare(root, 'before', ui.base, worktrees);
    const after = prepare(root, 'after', ui.head, worktrees);
    await serve(before, options.port, servers);
    await serve(after, options.port + 1, servers);

    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const files = [];
    const pairs = [];
    const problems = [];
    try {
      for (const route of options.routes) {
        for (const scheme of options.schemes) {
          for (const viewport of options.viewports) {
            const name = shotName(route, scheme, viewport);
            const shot = (side) => [`${name}-${side}.jpg`, join(shots, `${name}-${side}.jpg`)];
            await capture({ browser, url: servers[0].url, route, scheme, viewport, file: shot('before')[1] });
            const errors = await capture({ browser, url: servers[1].url, route, scheme, viewport, file: shot('after')[1] });
            problems.push(...errors.map((error) => `${route} ${scheme} ${viewport}: ${error}`));
            const changed = !readFileSync(shot('before')[1]).equals(readFileSync(shot('after')[1]));
            pairs.push({ route, scheme, viewport, name, changed });
            if (changed) files.push(shot('before'), shot('after'));
          }
        }
      }
    } finally {
      await browser.close();
    }

    const branch =
      options.head === 'HEAD' ? git(['rev-parse', '--abbrev-ref', 'HEAD']) : options.head.replace(/^(refs\/remotes\/)?origin\//, '');
    const prefix = `${branch.replace(/[^\w.-]+/g, '-')}/${ui.head.slice(0, 12)}`;
    const bytes = files.reduce((total, [, file]) => total + statSync(file).size, 0);
    if (bytes > MAX_BYTES) {
      throw new Error(
        `${(bytes / 1024 / 1024).toFixed(1)} MB of changed screenshots exceeds the ${MAX_BYTES / 1024 / 1024} MB limit for pr-evidence; narrow --routes, --schemes or --viewports to what the change affects.`,
      );
    }
    let images = (name) => join(shots, name);
    if (options.push && files.length) {
      const commit = publish(files, prefix);
      images = (name) => `https://github.com/${repoSlug()}/blob/${commit}/${prefix}/${name}?raw=true`;
    }
    const body = section({ ui, base: ui.base, head: ui.head, routes: options.routes, pairs, images });
    if (options.bodyOut) writeFileSync(options.bodyOut, body);
    process.stdout.write(`\n${body}`);
    if (problems.length) {
      process.stderr.write(`\nAfter-side runtime errors (report them in the PR):\n${problems.map((line) => `- ${line}`).join('\n')}\n`);
    }
  } finally {
    await Promise.all(servers.map(({ child }) => stop(child)));
    for (const dir of worktrees) {
      try {
        git(['worktree', 'remove', '--force', dir]);
      } catch (error) {
        process.stderr.write(`Could not remove temporary worktree ${dir}: ${error.message}\n`);
      }
    }
    if (options.push) rmSync(root, { recursive: true, force: true });
    else process.stdout.write(`Screenshots kept in ${shots}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`pr-screenshots: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
