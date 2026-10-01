import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const assessmentPath = '.visual-impact.json';
export const visualTests = {
  home: 'homepage preserves header and merchandising',
  search: 'populated search preserves its result card',
  product: 'product detail preserves its purchase controls',
  cart: 'populated cart preserves checkout entry',
  orders: 'customer order history remains readable and scrollable',
};

// Only known tooling/docs/tests are intrinsically outside the rendered app.
// Runtime code, server code, shared data, dependencies and unknown paths require tracing.
export function nonObservable(path) {
  return (
    /^(docs\/|\.agents\/|\.github\/|\.husky\/)/.test(path) ||
    /^(AGENTS\.md|README\.md|PROGRESS\.md|DECISIONS\.md|CONTEXT\.md|feature_list\.json|\.visual-impact\.json)$/.test(path) ||
    /^tests\/(?!visual\/)/.test(path) ||
    path === 'scripts/select-visual-checks.mjs'
  );
}

const full = (reason, fingerprint, files = []) => ({ mode: 'full', reason, fingerprint, files, tests: Object.keys(visualTests) });

export function select(files, fingerprint, assessments = []) {
  if (!files.length)
    return { mode: 'skip', reason: 'No observable runtime changes (docs/tooling/nonvisual tests only).', fingerprint, files, tests: [] };
  const assessment = assessments.find((entry) => entry?.fingerprint === fingerprint);
  if (!assessment) return full('Unassessed or stale runtime impact; trace consumers or run the full suite.', fingerprint, files);
  if (
    typeof assessment.reason !== 'string' ||
    !assessment.reason.trim() ||
    typeof assessment.consumers !== 'string' ||
    !assessment.consumers.trim()
  ) {
    return full('Assessment needs a reason and affected-consumer trace.', fingerprint, files);
  }
  if (assessment.impact === 'none')
    return { mode: 'skip', reason: `${assessment.reason} Consumer trace: ${assessment.consumers}`, fingerprint, files, tests: [] };
  if (
    assessment.impact === 'targeted' &&
    Array.isArray(assessment.tests) &&
    assessment.tests.length &&
    assessment.tests.every((key) => Object.hasOwn(visualTests, key))
  ) {
    return {
      mode: 'targeted',
      reason: `${assessment.reason} Consumer trace: ${assessment.consumers}`,
      fingerprint,
      files,
      tests: [...new Set(assessment.tests)],
    };
  }
  return full('Uncertain impact or invalid visual test selection; running the full suite.', fingerprint, files);
}

/** @param {{cwd?: string, input?: string, base?: string, head?: string, remote?: string, local?: boolean}} options */
export function plan({ cwd = process.cwd(), input = '', base, head = 'HEAD', remote = 'origin', local = false } = {}) {
  const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 50_000_000 });
  const zero = /^0+$/;
  const ranges = base
    ? [[base, head]]
    : input
        .trim()
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          const fields = line.trim().split(/\s+/);
          if (fields.length !== 4) throw new Error('Invalid pre-push ref input.');
          const [, localSha, , remoteSha] = fields;
          if (zero.test(localSha)) return []; // Remote branch deletion has no new UI to verify.
          const before = zero.test(remoteSha) ? git(['merge-base', localSha, `refs/remotes/${remote}/main`]).trim() : remoteSha;
          return [[before, localSha]];
        });
  if (!base && !input.trim()) throw new Error('Missing push refs; use --base for a local decision.');
  const decisions = ranges.flatMap(([before, after]) => {
    const isHead = git(['rev-parse', after]).trim() === git(['rev-parse', 'HEAD']).trim();
    if (!isHead) {
      if (git(['status', '--porcelain']).trim()) throw new Error('Dirty checkout cannot verify a different pushed head.');
      const otherRuntime = git(['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-only', '-z', after, 'HEAD'])
        .split('\0')
        .filter((file) => file && !nonObservable(file));
      if (otherRuntime.length)
        throw new Error('Pushed runtime differs from checkout; verify and push each runtime head from its own checkout.');
    }
    const diffArgs = ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--full-index', '--no-color', '--no-relative'];
    const revisions = [before, after];
    const changed = git([...diffArgs, '--name-only', '-z', ...revisions])
      .split('\0')
      .filter(Boolean);
    const untracked = isHead ? git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean) : [];
    const files = [...new Set(changed.filter((file) => !nonObservable(file)))].sort();
    const hash = createHash('sha256');
    if (files.length) hash.update(git([...diffArgs, '--binary', ...revisions, '--', ...files]));
    const fingerprint = hash.digest('hex');
    let assessments = [];
    try {
      const contents = local ? readFileSync(`${cwd}/${assessmentPath}`, 'utf8') : git(['show', `${after}:${assessmentPath}`]);
      assessments = JSON.parse(contents).assessments;
      if (!Array.isArray(assessments)) assessments = [];
    } catch {
      /* Absent/malformed assessment is conservative, never a skip. */
    }
    const decisions = [select(files, fingerprint, assessments)];
    if (isHead) {
      const dirty = git([...diffArgs, '--name-only', '-z', 'HEAD'])
        .split('\0')
        .filter(Boolean);
      const dirtyFiles = [...new Set([...dirty, ...untracked].filter((file) => !nonObservable(file)))].sort();
      if (dirtyFiles.length) {
        const dirtyHash = createHash('sha256').update(git([...diffArgs, '--binary', 'HEAD', '--', ...dirtyFiles]));
        for (const file of untracked.filter((file) => !nonObservable(file)).sort()) {
          dirtyHash.update(`\0${file}\0`).update(readFileSync(`${cwd}/${file}`));
        }
        decisions.push(select(dirtyFiles, dirtyHash.digest('hex'), assessments));
      }
    }
    return decisions;
  });
  if (!decisions.length) return { mode: 'skip', reason: 'Only remote ref deletions.', tests: [], decisions };
  const mode = decisions.some((decision) => decision.mode === 'full')
    ? 'full'
    : decisions.some((decision) => decision.mode === 'targeted')
      ? 'targeted'
      : 'skip';
  return { mode, tests: [...new Set(decisions.flatMap((decision) => decision.tests))], decisions };
}

/**
 * @param {{mode: string, tests?: string[]}} selection
 * @param {{platform?: string, run?: (args: string[]) => {status: number | null, error?: Error}}} options
 */
export function runSelection(
  selection,
  { platform = process.platform, run = (args) => spawnSync('pnpm', args, { stdio: 'inherit' }) } = {},
) {
  if (selection.mode === 'skip') return 0;
  if (platform !== 'darwin') {
    process.stdout.write(
      'Skipping selected visuals: reviewed baselines currently support macOS only. Browser evidence is still required for UI impact.\n',
    );
    return 0;
  }
  const args = ['test:visual'];
  if (selection.mode === 'targeted') args.push('--grep', (selection.tests ?? []).map((key) => visualTests[key]).join('|'));
  const result = run(args);
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const baseIndex = args.indexOf('--base');
    const selection = plan({
      input: baseIndex < 0 ? readFileSync(0, 'utf8') : '',
      base: baseIndex < 0 ? undefined : args[baseIndex + 1],
      remote: args[0] && !args[0].startsWith('--') ? args[0] : 'origin',
      local: baseIndex >= 0,
    });
    process.stdout.write(`${JSON.stringify(selection, null, 2)}\n`);
    if (args.includes('--verify')) {
      const result = spawnSync('pnpm', ['verify'], { stdio: ['ignore', 'inherit', 'inherit'] });
      if (result.error) throw result.error;
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
    if (args.includes('--run')) process.exitCode = runSelection(selection);
  } catch (error) {
    process.stderr.write(`Visual selection failed: ${error.message}. Resolve the range/assessment before pushing.\n`);
    process.exitCode = 1;
  }
}
