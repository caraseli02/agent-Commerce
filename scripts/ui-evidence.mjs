import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Before/after screenshots for UI PRs (scripts/pr-screenshots.mjs) live on this branch only.
// It is never merged; PR bodies link its images by commit SHA so they never change.
export const evidenceBranch = 'pr-evidence';
export const evidenceRef = `refs/heads/${evidenceBranch}`;
// Vercel deploys every pushed branch and reads vercel.json from the pushed commit, so the evidence
// branch carries its own switch-off. Without it each screenshot push would start a deployment.
export const evidenceVercelConfig = '{\n  "git": { "deploymentEnabled": false }\n}\n';

// Files whose change a reviewer should be able to see. Server, data and tooling changes can be
// visible too, but paths cannot prove it; those PRs keep the browser-evidence rule instead.
export function uiPath(path) {
  return (
    /^app\/(?!.*\.(spec|test)\.[jt]s$)/.test(path) ||
    /^public\//.test(path) ||
    /^(nuxt|app|tailwind)\.config\.[cm]?[jt]s$/.test(path) ||
    path === 'components.json'
  );
}

function gitIn(cwd) {
  return (args, options = {}) =>
    execFileSync('git', ['--literal-pathspecs', ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 200_000_000,
      ...options,
    });
}

/**
 * The PR's own UI change: files under uiPath() between the merge base with main and `head`,
 * plus a fingerprint of that change. The fingerprint hashes only the lines the PR removes and
 * adds (zero context, no blob IDs, no hunk positions), and the head blob of binary files. A
 * conflict-free merge of main, even one that edits other lines of the same file, keeps it; any
 * edit to the PR's own UI lines changes it, so screenshots go stale exactly then.
 */
export function uiDiff({ cwd = process.cwd(), head = 'HEAD', remote = 'origin' } = {}) {
  const git = gitIn(cwd);
  const headSha = git(['rev-parse', '--verify', `${head}^{commit}`]).trim();
  const base = git(['merge-base', `refs/remotes/${remote}/main`, headSha]).trim();
  const files = git(['diff', '--no-renames', '--name-only', '-z', base, headSha])
    .split('\0')
    .filter((file) => file && uiPath(file))
    .sort();
  if (!files.length) return { base, head: headSha, files, fingerprint: null };
  const hash = createHash('sha256');
  const patch = git(
    ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=0', '--no-color', base, headSha, '--', ...files],
    {
      encoding: 'buffer',
    },
  );
  for (const line of patch.toString('latin1').split('\n')) {
    if (line.startsWith('index ')) continue; // whole-file blob IDs change when main edits other lines
    hash.update(`${line.startsWith('@@') ? '@@' : line}\n`); // hunk positions shift with main's edits
  }
  // Text diffs say only "Binary files differ"; the head blob pins the binary content itself.
  const binaries = git(['diff', '--no-renames', '--numstat', '-z', base, headSha, '--', ...files])
    .split('\0')
    .filter((entry) => entry.startsWith('-\t-\t'))
    .map((entry) => entry.slice(4));
  for (const file of binaries.sort()) {
    let blob = 'deleted';
    try {
      blob = git(['rev-parse', `${headSha}:${file}`]).trim();
    } catch {
      /* deleted in the PR */
    }
    hash.update(`binary ${file} ${blob}\n`);
  }
  return { base, head: headSha, files, fingerprint: hash.digest('hex') };
}

/**
 * File stem for one route, scheme and viewport. The readable slug alone collides for routes that
 * differ only in punctuation (`?keyword=a.b` and `?keyword=a-b`), so a digest of the exact route
 * keeps every route's before/after pair apart.
 */
export function shotName(route, scheme, viewport) {
  const readable =
    route
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'home';
  const digest = createHash('sha256').update(route).digest('hex').slice(0, 8);
  return `${readable}-${digest}-${scheme}-${viewport}`;
}

export function screenshotMarker(fingerprint) {
  return `<!-- pr-screenshots: ui=${fingerprint} -->`;
}

/**
 * The pr-evidence branch only ever gains screenshots, and every tip keeps the vercel.json that turns
 * Vercel off. Called by the pre-push hook for pushes to it, so it cannot carry code, delete earlier
 * evidence, be rewritten or start a deployment.
 */
export function checkEvidencePush({ cwd = process.cwd(), localSha, remoteSha }) {
  const git = gitIn(cwd);
  const zero = /^0+$/;
  if (zero.test(localSha)) throw new Error(`${evidenceBranch} is append-only; it cannot be deleted.`);
  const range = zero.test(remoteSha) ? [localSha] : [localSha, `^${remoteSha}`];
  if (!zero.test(remoteSha)) {
    try {
      git(['merge-base', '--is-ancestor', remoteSha, localSha]);
    } catch {
      throw new Error(`${evidenceBranch} is append-only; the push does not extend its current tip.`);
    }
  }
  const lines = git(['log', '--format=', '--name-status', '--no-renames', ...range])
    .split('\n')
    .filter(Boolean);
  const bad = lines.filter((line) => {
    const [status, path] = line.split('\t');
    return status !== 'A' || !(path === 'vercel.json' || /^[\w.-]+(\/[\w.-]+)+\.(png|jpg)$/.test(path ?? ''));
  });
  if (bad.length) throw new Error(`${evidenceBranch} accepts only added screenshots; found: ${bad.slice(0, 5).join(', ')}.`);
  let config = '';
  try {
    config = git(['show', `${localSha}:vercel.json`]);
  } catch {
    /* reported below */
  }
  if (config !== evidenceVercelConfig) {
    throw new Error(`${evidenceBranch} must keep vercel.json with deployments disabled, or Vercel deploys every push.`);
  }
}
