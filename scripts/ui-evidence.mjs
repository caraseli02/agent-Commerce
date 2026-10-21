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
 * plus a fingerprint of that patch. Merging main keeps the fingerprint unless the PR's UI diff
 * itself changes, so screenshots stay valid across no-op merges and go stale on real edits.
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
  const patch = git(
    ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--full-index', '--binary', '--no-color', base, headSha, '--', ...files],
    {
      encoding: 'buffer',
    },
  );
  return { base, head: headSha, files, fingerprint: createHash('sha256').update(patch).digest('hex') };
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
