import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join, relative, resolve } from 'node:path';

export const receiptPath = 'tmp/verification/delivery.json';
const receiptLifetimeMs = 4 * 60 * 60 * 1000;

// Hook-local Git variables must not redirect verification subprocesses or test fixtures.
export function verificationEnvironment(env = process.env) {
  const result = { ...env };
  for (const name of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_COMMON_DIR',
    'GIT_PREFIX',
    'GIT_IMPLICIT_WORK_TREE',
    'GIT_INTERNAL_SUPER_PREFIX',
    'GIT_GRAFT_FILE',
    'GIT_SHALLOW_FILE',
    'GIT_NO_REPLACE_OBJECTS',
    'GIT_REPLACE_REF_BASE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_CONFIG',
    'GIT_CONFIG_PARAMETERS',
    'GIT_CONFIG_COUNT',
  ])
    delete result[name];
  for (const name of Object.keys(result)) if (/^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(name)) delete result[name];
  return result;
}

const git = (cwd, args) =>
  execFileSync('git', ['--literal-pathspecs', ...args], {
    cwd,
    env: verificationEnvironment(),
    encoding: 'utf8',
    maxBuffer: 50_000_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

export function documentationPath(path) {
  return (
    /^(AGENTS\.md|README\.md|PROGRESS\.md|DECISIONS\.md|CONTEXT\.md|feature_list\.json)$/.test(path) ||
    /^(docs\/|\.agents\/skills\/).+\.md$/.test(path)
  );
}

export function assertPushedCheckout(cwd, head) {
  if (git(cwd, ['rev-parse', head]).trim() !== git(cwd, ['rev-parse', 'HEAD']).trim())
    throw new Error('Verify each pushed head from its own checkout.');
  if (git(cwd, ['status', '--porcelain']).trim()) throw new Error('Pre-push verification requires a clean checkout of the pushed head.');
}

export function documentationChanges(cwd, base, head = 'HEAD') {
  if (!base) return null;
  try {
    // Deletions and both sides of renames participate; unknown paths fail closed.
    const files = git(cwd, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-only', '-z', base, head])
      .split('\0')
      .filter(Boolean);
    const dirty = git(cwd, ['diff', '--name-only', '-z', 'HEAD']).split('\0').filter(Boolean);
    const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
    const differentHead = git(cwd, ['diff', '--no-renames', '--name-only', '-z', head, 'HEAD']).split('\0').filter(Boolean);
    if (differentHead.some((file) => !documentationPath(file))) throw new Error('Pushed executable inputs differ from checkout.');
    if (!files.length || [...files, ...dirty, ...untracked].some((file) => !documentationPath(file))) return null;
    // A Markdown path cannot disguise a new symlink or executable.
    for (const revision of [base, head]) {
      const entries = git(cwd, ['ls-tree', '-r', '-z', revision, '--', ...files])
        .split('\0')
        .filter(Boolean);
      if (entries.some((entry) => !entry.startsWith('100644 blob '))) return null;
    }
    if (
      [...dirty, ...untracked].some((file) => {
        const path = join(cwd, file);
        return existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).mode & 0o111);
      })
    )
      return null;
    return [...new Set([...files, ...dirty, ...untracked])].filter((file) => existsSync(join(cwd, file))).sort();
  } catch (error) {
    // Unavailable bases run the full gate; an untestable pushed tree blocks.
    if (error.message === 'Pushed executable inputs differ from checkout.') throw error;
    return null;
  }
}

function hashPath(hash, path, label, ancestors = new Set()) {
  hash.update(`\0${label}\0`);
  if (!existsSync(path)) {
    hash.update('missing');
    return;
  }
  const stat = lstatSync(path);
  hash.update(String(stat.mode & 0o777));
  const resolved = realpathSync(path);
  if (ancestors.has(resolved)) throw new Error('Cyclic verification input');
  if (stat.isSymbolicLink()) hash.update(`link:${resolved}`);
  if (stat.isDirectory() || lstatSync(resolved).isDirectory()) {
    const next = new Set([...ancestors, resolved]);
    for (const file of readdirSync(path).sort()) hashPath(hash, join(path, file), `${label}/${file}`, next);
  } else {
    hash.update(readFileSync(path));
  }
}

export function inputFingerprint(cwd, env = process.env) {
  try {
    const hash = createHash('sha256');
    const gitExecPath = realpathSync(git(cwd, ['--exec-path']).trim());
    hash.update(
      JSON.stringify([
        realpathSync(cwd),
        process.version,
        process.platform,
        process.arch,
        execFileSync('pnpm', ['--version'], { cwd, env: verificationEnvironment(env), encoding: 'utf8' }).trim(),
        git(cwd, ['--version']).trim(),
        gitExecPath,
      ]),
    );
    const environment = Object.entries(env)
      .filter(([key]) =>
        /^(NODE_|NUXT_|NITRO_|DATABASE_|STRIPE_|PAYMENTS_|MOCK_|VITE_|VERCEL|PLAYWRIGHT_|VITEST_|SMOKE_|TZ$|LANG$|LC_|PATH$|HOST$|PORT$)/.test(
          key,
        ),
      )
      .map(([key, value]) => [
        key,
        key === 'PATH' && typeof value === 'string'
          ? [
              ...new Set(
                value
                  .split(delimiter)
                  .map((directory) => {
                    const absolute = resolve(cwd, directory);
                    return existsSync(absolute) ? realpathSync(absolute) : absolute;
                  })
                  .filter((directory) => directory !== gitExecPath),
              ),
            ].join(delimiter)
          : value,
      ])
      .sort(([a], [b]) => a.localeCompare(b));
    hash.update(JSON.stringify(environment)); // Only the digest is stored; credentials never leave the process.
    const files = [
      ...new Set(git(cwd, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)),
    ].sort();
    for (const file of files) {
      if (documentationPath(file) || file === '.visual-impact.json') continue;
      const path = join(cwd, file);
      // Known skill aliases point back into the separately fingerprinted tree.
      // Include link identity; arbitrary files and external targets still hash fully.
      if (/^(skills\/|\.claude\/skills\/)[^/]+$/.test(file) && existsSync(path) && lstatSync(path).isSymbolicLink()) {
        const target = realpathSync(path);
        const inside = relative(join(realpathSync(cwd), '.agents/skills'), target);
        if (inside && !inside.startsWith('..') && !inside.startsWith('/')) {
          hash.update(`\0${file}\0link:${target}`);
          continue;
        }
      }
      hashPath(hash, path, file);
    }
    for (const file of ['.env', '.env.local', 'node_modules/.modules.yaml', 'node_modules/.pnpm/lock.yaml'])
      hashPath(hash, join(cwd, file), file);
    if (!existsSync(join(cwd, 'node_modules/.pnpm/lock.yaml'))) return null;
    for (const path of ['node_modules', 'node_modules/.pnpm', 'node_modules/.pnpm/lock.yaml']) {
      const stat = lstatSync(join(cwd, path));
      hash.update(JSON.stringify([path, stat.ino, stat.mtimeMs, stat.ctimeMs]));
    }
    return hash.digest('hex');
  } catch {
    return null;
  }
}

export function artifactFingerprint(cwd) {
  try {
    if (!existsSync(join(cwd, '.output/server/index.mjs')) || !existsSync(join(cwd, '.nuxt/tsconfig.json'))) return null;
    const hash = createHash('sha256');
    for (const path of ['.output', '.nuxt']) hashPath(hash, join(cwd, path), path);
    return hash.digest('hex');
  } catch {
    return null;
  }
}

export function reusableReceipt(cwd, fingerprint, env = process.env, now = Date.now()) {
  if (env.CI || !fingerprint) return false;
  try {
    const receipt = JSON.parse(readFileSync(join(cwd, receiptPath), 'utf8'));
    return (
      receipt.version === 1 &&
      receipt.input === fingerprint &&
      typeof receipt.completedAt === 'number' &&
      now >= receipt.completedAt &&
      now - receipt.completedAt < receiptLifetimeMs &&
      typeof receipt.artifacts === 'string' &&
      receipt.artifacts === artifactFingerprint(cwd)
    );
  } catch {
    return false;
  }
}

export function discardReceipt(cwd) {
  rmSync(join(cwd, receiptPath), { force: true });
}

export function recordReceipt(cwd, fingerprint, env = process.env) {
  if (env.CI || !fingerprint) return;
  const artifacts = artifactFingerprint(cwd);
  if (!artifacts) return;
  const path = join(cwd, receiptPath);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}`;
  writeFileSync(temporary, JSON.stringify({ version: 1, input: fingerprint, artifacts, completedAt: Date.now() }) + '\n', { mode: 0o600 });
  renameSync(temporary, path);
}
