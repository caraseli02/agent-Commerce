// Owned-server browser check for Claude's unattended night lane (.factory/automations/claude-maintenance.md §6.1).
//
// Builds the checked-out tree, starts its Nitro output on a free port in its own process group, proves the
// listener is that process, runs one locked Playwright config against it, and always stops what it started.
// No shell anywhere: every child is spawned from an argv array with shell:false.
//
// Run it inside the test-database wrapper, which creates a random schema and sets DATABASE_URL:
//   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/with-test-database.mjs \
//     node scripts/owned-server-check.mjs --config <performance|e2e|parity> [--grep <pattern>] [--minutes 40] \
//     [--port 3205] [--any-head] [--bisect] [tests/....spec.ts ...]
//
// Exit codes: the Playwright exit code (0 pass, other non-zero = candidate finding); 1 when the build fails;
// 75 for an environment failure (no test matches the selection or the config does not load, wrong head, unwrapped or non-local database, busy port, readiness timeout,
// listener identity mismatch, budget exhausted, interrupted, bad arguments). With --bisect: 0 → 0, 75 → 125
// (git bisect "skip"), any other non-zero → 1, and a failed build is an environment failure.
//
// Bisect: historical revisions may predate this script, its config, the spec or the wrapper, so never run the
// checkout's copy. Pin the reviewed copy outside the checkout and run it as one bisect step:
//   git show origin/main:scripts/owned-server-check.mjs > "$PIN/owned-server-check.mjs"
//   git bisect run node "$PIN/owned-server-check.mjs" bisect-step --config <name> [--grep ...] [--port ...] [specs]
// The step skips (125) any revision missing a prerequisite or whose install fails, runs the wrapper and the pinned
// check for the rest, and reports bad (1) only when the check itself printed result=fail.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, openSync, closeSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENVIRONMENT_EXIT = 75;
export const BISECT_SKIP_EXIT = 125;
export const CONFIGS = Object.freeze({
  performance: 'playwright.performance.config.ts',
  e2e: 'playwright.config.ts',
  parity: 'playwright.parity.config.ts',
});
export const LOCAL_DATABASE_HOSTS = Object.freeze(['localhost', '127.0.0.1', '::1']);
export const SPEC_PATTERN = /^tests\/[A-Za-z0-9_./-]+\.spec\.ts$/;
// Defense in depth: nothing reaches a shell, but a focused filter never needs shell syntax either.
// `$` is allowed only as a trailing regex anchor, so `$(...)` and `${...}` are rejected.
export const GREP_PATTERN = /^[A-Za-z0-9 _.,:@#/|()[\]^*+?{}'"\\-]+\$?$/;
const READINESS_SECONDS = 120;
const STOP_GRACE_MS = 10_000;
const DEFAULTS = Object.freeze({ port: 3205, minutes: 40 });

export class EnvironmentFailure extends Error {}

/**
 * Strict argv parser. Throws EnvironmentFailure on anything it does not recognise.
 * `fileExists` is injectable so tests do not depend on the working tree.
 */
export function parseArgs(argv, { fileExists = (path) => existsSync(path) && statSync(path).isFile() } = {}) {
  const options = {
    config: undefined,
    grep: undefined,
    minutes: DEFAULTS.minutes,
    port: DEFAULTS.port,
    anyHead: false,
    bisect: false,
    specs: [],
  };
  const seen = new Set();
  const once = (flag) => {
    if (seen.has(flag)) throw new EnvironmentFailure(`duplicate flag ${flag}`);
    seen.add(flag);
  };
  const valueOf = (flag, index) => {
    const value = argv[index + 1];
    if (value === undefined || value === '' || value.startsWith('-')) throw new EnvironmentFailure(`${flag} needs a value`);
    return value;
  };
  const integer = (flag, raw, min, max) => {
    if (!/^[0-9]+$/.test(raw)) throw new EnvironmentFailure(`${flag} must be an integer`);
    const value = Number(raw);
    if (value < min || value > max) throw new EnvironmentFailure(`${flag} must be between ${min} and ${max}`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (typeof argument !== 'string' || argument.includes('\0')) throw new EnvironmentFailure('invalid argument');
    switch (argument) {
      case '--config': {
        once(argument);
        const name = valueOf(argument, index++);
        if (!Object.hasOwn(CONFIGS, name)) throw new EnvironmentFailure(`--config must be one of ${Object.keys(CONFIGS).join(', ')}`);
        options.config = name;
        break;
      }
      case '--grep': {
        once(argument);
        const pattern = valueOf(argument, index++);
        if (pattern.length > 200 || !GREP_PATTERN.test(pattern)) throw new EnvironmentFailure('--grep contains unsupported characters');
        options.grep = pattern;
        break;
      }
      case '--minutes':
        once(argument);
        options.minutes = integer(argument, valueOf(argument, index++), 1, 45);
        break;
      case '--port':
        once(argument);
        options.port = integer(argument, valueOf(argument, index++), 1024, 65535);
        break;
      case '--any-head':
        once(argument);
        options.anyHead = true;
        break;
      case '--bisect':
        once(argument);
        options.bisect = true;
        break;
      default: {
        if (argument.startsWith('-')) throw new EnvironmentFailure(`unknown flag ${argument}`);
        if (!SPEC_PATTERN.test(argument) || argument.includes('..') || argument.includes('//')) {
          throw new EnvironmentFailure(`unsupported spec path ${argument}`);
        }
        if (!fileExists(argument)) throw new EnvironmentFailure(`spec not found: ${argument}`);
        if (!options.specs.includes(argument)) options.specs.push(argument);
      }
    }
  }
  if (!options.config) throw new EnvironmentFailure('--config is required');
  return options;
}

/** Accepts only a local PostgreSQL URL whose search_path was set by scripts/with-test-database.mjs. */
export function validateDatabaseUrl(value) {
  if (!value) throw new EnvironmentFailure('DATABASE_URL is not set; run inside scripts/with-test-database.mjs');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new EnvironmentFailure('DATABASE_URL is not a valid URL');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new EnvironmentFailure('DATABASE_URL is not a PostgreSQL URL');
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  if (!LOCAL_DATABASE_HOSTS.includes(host)) throw new EnvironmentFailure('DATABASE_URL host is not local; hosted databases are forbidden');
  const schema = url.searchParams
    .getAll('options')
    .map((option) => option.match(/(?:^|\s)-c\s*search_path=(ecas_test_[0-9a-f]+)(?:\s|$)/)?.[1])
    .find(Boolean);
  if (!schema) throw new EnvironmentFailure('DATABASE_URL has no search_path=ecas_test_ option; run inside scripts/with-test-database.mjs');
  return { host, schema };
}

/** Final process exit code. Without --bisect the code passes through. */
export function mapExitCode(code, { bisect = false } = {}) {
  const normalized = Number.isInteger(code) && code >= 0 && code <= 255 ? code : ENVIRONMENT_EXIT;
  if (!bisect) return normalized;
  if (normalized === 0) return 0;
  if (normalized === ENVIRONMENT_EXIT) return BISECT_SKIP_EXIT;
  return 1;
}

export function resultLabel(code) {
  if (code === 0) return 'pass';
  if (code === ENVIRONMENT_EXIT) return 'environment';
  return 'fail';
}

/** argv for `pnpm`, never joined into a string. */
export function buildPlaywrightArgs({ config, grep, specs = [] }) {
  if (!Object.hasOwn(CONFIGS, config)) throw new EnvironmentFailure(`unknown config ${config}`);
  const args = ['exec', 'playwright', 'test', `--config=${CONFIGS[config]}`, '--update-snapshots=none'];
  if (grep !== undefined) args.push(`--grep=${grep}`);
  return [...args, ...specs];
}

/** argv that lists the selected tests without running them (no server needed: the base URL variables are set). */
export function buildListArgs(options) {
  const [exec, playwright, test, ...rest] = buildPlaywrightArgs(options);
  return [exec, playwright, test, '--list', ...rest];
}

/** Number of tests from `playwright test --list` output (`Total: N tests in M files`), or undefined. */
export function listedTestCount(output) {
  const totals = [...String(output ?? '').matchAll(/^Total: (\d+) tests? in \d+ files?$/gm)];
  return totals.length ? Number(totals.at(-1)[1]) : undefined;
}

/**
 * Listener identity: every listening PID must be the server or a member of its process group,
 * and there must be at least one. `pgidOf` returns a PID's process group (or undefined if gone).
 */
export function listenersOwnedBy(listenerPids, serverPid, pgidOf) {
  if (!listenerPids.length) return false;
  return listenerPids.every((pid) => pid === serverPid || pgidOf(pid) === serverPid);
}

/**
 * Environment for the Playwright run. Each config reads its own external-base-URL variable and only skips its
 * own `webServer` (a second build into .output plus a server on another port) when that variable is set:
 * e2e and performance read PLAYWRIGHT_BASE_URL, parity reads PARITY_BASE_URL.
 */
export const BASE_URL_VARIABLES = Object.freeze(['PLAYWRIGHT_BASE_URL', 'PARITY_BASE_URL']);
export function testEnvironment(runtimeEnv, baseUrl) {
  return { ...runtimeEnv, ...Object.fromEntries(BASE_URL_VARIABLES.map((name) => [name, baseUrl])) };
}

/** `code` is the unmapped outcome (0 / 75 / other); `exitCode` is what the process exits with (after --bisect mapping). */
export function summaryLine({ config, head, port, code, exitCode = code }) {
  return `owned-server-check: config=${config ?? 'unknown'} head=${head ?? 'unknown'} port=${port ?? 'unknown'} result=${resultLabel(code)} exit=${exitCode}`;
}

// ---------------------------------------------------------------------------------------------------------------
export const TEST_DATABASE_WRAPPER = 'scripts/with-test-database.mjs';

/** Prerequisites a bisect revision must carry for the check to mean anything; returns the missing paths. */
export function bisectPrerequisitesMissing({ config, specs = [] }, fileExists = (path) => existsSync(path) && statSync(path).isFile()) {
  return [TEST_DATABASE_WRAPPER, CONFIGS[config], ...specs].filter((path) => !path || !fileExists(path));
}

/** Arguments forwarded from `bisect-step` to the wrapped check; the step adds --any-head and --bisect itself. */
export function bisectForwardArgs(argv) {
  return argv.filter((argument) => argument !== '--any-head' && argument !== '--bisect');
}

/**
 * git bisect verdict from the wrapped check's stdout: bad (1) only for its own `result=fail` summary line,
 * good (0) only for `result=pass exit=0`; anything else (no summary, environment, wrapper or toolchain
 * failure) skips with 125, so missing tooling never marks a revision bad.
 */
export function bisectStepExit(output) {
  const summaries = String(output ?? '').match(/^owned-server-check: .* result=(pass|fail|environment) exit=(\d+)$/gm) ?? [];
  const last = summaries.at(-1)?.match(/result=(pass|fail|environment) exit=(\d+)$/);
  if (last?.[1] === 'pass' && last[2] === '0') return 0;
  if (last?.[1] === 'fail') return 1;
  return BISECT_SKIP_EXIT;
}

// Runtime section. It builds the app, serves it and drives a browser, so manual smoke runs cover it instead of unit tests.

const LSOF = existsSync('/usr/sbin/lsof') ? '/usr/sbin/lsof' : 'lsof';
const owned = new Set();
let interruptReason;
const interruptWaiters = new Set();

function onInterrupt(signal) {
  if (interruptReason) return;
  interruptReason = `interrupted by ${signal}`;
  for (const wake of interruptWaiters) wake();
}

function listenerPids(port) {
  try {
    const output = execFileSync(LSOF, ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set(output.split(/\s+/).filter(Boolean).map(Number))];
  } catch (error) {
    if (error.status === 1) return [];
    throw new EnvironmentFailure('cannot inspect port listeners with lsof');
  }
}

function pgidOf(pid) {
  try {
    const value = Number(
      execFileSync('ps', ['-o', 'pgid=', '-p', String(pid)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(),
    );
    return Number.isInteger(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function canBind(port) {
  return new Promise((resolveBind) => {
    const server = createServer();
    server.once('error', () => resolveBind(false));
    server.listen({ port, host: '127.0.0.1', exclusive: true }, () => server.close(() => resolveBind(true)));
  });
}

async function requireFreePort(port) {
  if (listenerPids(port).length) throw new EnvironmentFailure(`port ${port} busy; leaving the existing listener alone`);
  if (!(await canBind(port))) throw new EnvironmentFailure(`port ${port} cannot be bound`);
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new EnvironmentFailure(`git ${args.join(' ')} failed`);
  }
}

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

function groupAlive(pgid) {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/** Spawns a child as the leader of a new process group and records it as owned. */
function spawnOwned(command, args, { env, stdio, stopSignals = ['SIGTERM'] }) {
  const child = spawn(command, args, { env, stdio, detached: true, shell: false });
  const exited = new Promise((resolveExit) => {
    child.once('error', (error) => resolveExit({ code: null, signal: null, error }));
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });
  const handle = { child, pgid: child.pid, exited, done: false, stopSignals };
  exited.then(() => {
    handle.done = true;
  });
  if (child.pid) owned.add(handle);
  return handle;
}

/** Resolves with the exit, or with 'timeout' / 'interrupted', whichever comes first. */
async function waitOwned(handle, deadline) {
  let timer;
  let wake;
  const remaining = Math.max(0, deadline - Date.now());
  const stop = new Promise((resolveStop) => {
    timer = setTimeout(() => resolveStop('timeout'), remaining);
    wake = () => resolveStop('interrupted');
    if (interruptReason) wake();
    else interruptWaiters.add(wake);
  });
  try {
    return await Promise.race([handle.exited, stop]);
  } finally {
    clearTimeout(timer);
    interruptWaiters.delete(wake);
  }
}

/** Signals the owned group (SIGTERM by default), SIGKILL after the grace period; only ever a group this run created. */
async function stopOwned(handle) {
  if (!owned.has(handle)) return;
  const { pgid } = handle;
  const signalGroup = (signal) => {
    try {
      process.kill(-pgid, signal);
    } catch {
      // Group already gone.
    }
  };
  for (const signal of handle.stopSignals) {
    if (!groupAlive(pgid)) break;
    signalGroup(signal);
    const graceEnd = Date.now() + STOP_GRACE_MS;
    while (groupAlive(pgid) && Date.now() < graceEnd) await delay(100);
  }
  if (groupAlive(pgid)) {
    signalGroup('SIGKILL');
    const killEnd = Date.now() + 5_000;
    while (groupAlive(pgid) && Date.now() < killEnd) await delay(50);
  }
  if (!handle.done) await Promise.race([handle.exited, delay(2_000)]);
  owned.delete(handle);
}

async function stopAllOwned() {
  for (const handle of [...owned].reverse()) await stopOwned(handle);
}

function outcomeCode(result, stage) {
  if (result === 'timeout') throw new EnvironmentFailure(`budget exhausted during ${stage}`);
  if (result === 'interrupted') throw new EnvironmentFailure(interruptReason);
  if (result.error) throw new EnvironmentFailure(`${stage} could not start: ${result.error.message}`);
  if (result.signal) throw new EnvironmentFailure(`${stage} terminated by ${result.signal}`);
  return result.code ?? ENVIRONMENT_EXIT;
}

async function waitForReady(server, port, deadline) {
  const readyBy = Math.min(deadline, Date.now() + READINESS_SECONDS * 1000);
  const url = `http://127.0.0.1:${port}/`;
  while (Date.now() < readyBy) {
    if (interruptReason) throw new EnvironmentFailure(interruptReason);
    if (server.done) throw new EnvironmentFailure('owned server exited before readiness');
    const listeners = listenerPids(port);
    if (listeners.length && !listenersOwnedBy(listeners, server.pgid, pgidOf)) {
      throw new EnvironmentFailure(`port ${port} is served by another process; refusing to attach`);
    }
    if (listeners.length) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
        await response.arrayBuffer().catch(() => {});
        if (response.ok) return;
      } catch {
        // Not ready yet.
      }
    }
    await delay(1_000);
  }
  throw new EnvironmentFailure(
    Date.now() >= deadline ? 'budget exhausted before readiness' : `owned server not ready within ${READINESS_SECONDS}s`,
  );
}

// A selection that matches nothing (a title or scenario this revision does not have yet) or a config that
// does not load is not a failing test, so it never becomes a finding or a bisect "bad".
function requireSelectedTests(options) {
  const listing = spawnSync('pnpm', buildListArgs(options), {
    env: testEnvironment(process.env, `http://127.0.0.1:${options.port}`),
    encoding: 'utf8',
    timeout: 120_000,
    shell: false,
  });
  const count = listedTestCount(listing.stdout);
  if (listing.status !== 0 || !count) {
    throw new EnvironmentFailure(
      `no selected tests at this revision (playwright --list exit ${listing.status ?? 'none'}, ${count ?? 'unknown'} tests)`,
    );
  }
  process.stdout.write(`owned-server-check: ${count} selected test(s)\n`);
}

async function run(options, state) {
  const startedAt = Date.now();
  const deadline = startedAt + options.minutes * 60_000;

  state.head = git(['rev-parse', 'HEAD']);
  if (!options.anyHead) {
    const main = git(['rev-parse', 'origin/main']);
    if (state.head !== main) throw new EnvironmentFailure(`HEAD ${state.head} is not origin/main ${main}; pass --any-head to allow it`);
  }
  validateDatabaseUrl(process.env.DATABASE_URL);
  if (process.env.DATABASE_URL_UNPOOLED) validateDatabaseUrl(process.env.DATABASE_URL_UNPOOLED);
  await requireFreePort(options.port);
  requireSelectedTests(options);

  const logDirectory = mkdtempSync(join(tmpdir(), 'owned-server-check-'));
  const buildLog = join(logDirectory, 'build.log');
  const serverLog = join(logDirectory, 'server.log');
  process.stdout.write(`owned-server-check: building (log ${buildLog})\n`);
  const buildFd = openSync(buildLog, 'w');
  let buildCode;
  try {
    const build = spawnOwned('pnpm', ['build'], { env: process.env, stdio: ['ignore', buildFd, buildFd] });
    buildCode = outcomeCode(await waitOwned(build, deadline), 'build');
    await stopOwned(build);
  } finally {
    closeSync(buildFd);
  }
  if (buildCode !== 0) {
    console.error(`owned-server-check: build failed with exit ${buildCode}; see ${buildLog}`);
    // A historical revision that does not build cannot be judged by a runtime check.
    return options.bisect ? ENVIRONMENT_EXIT : 1;
  }

  // The build can take minutes; re-check that nobody took the port meanwhile.
  await requireFreePort(options.port);
  const baseUrl = `http://127.0.0.1:${options.port}`;
  const runtimeEnv = {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(options.port),
    NUXT_PUBLIC_MOCK_MODE: 'true',
    NUXT_PUBLIC_BASE_URL_API: '/api',
    PAYMENTS_PROVIDER: 'mock',
    STRIPE_GATE_A_APPROVED: 'false',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
  };
  const serverFd = openSync(serverLog, 'w');
  let server;
  try {
    server = spawnOwned(process.execPath, ['.output/server/index.mjs'], { env: runtimeEnv, stdio: ['ignore', serverFd, serverFd] });
  } finally {
    closeSync(serverFd);
  }
  state.server = server;
  process.stdout.write(`owned-server-check: server pid ${server.pgid} on ${baseUrl} (log ${serverLog})\n`);
  await waitForReady(server, options.port, deadline);
  if (!listenersOwnedBy(listenerPids(options.port), server.pgid, pgidOf)) {
    throw new EnvironmentFailure(`listener on port ${options.port} is not the owned server`);
  }

  const args = buildPlaywrightArgs(options);
  process.stdout.write(`owned-server-check: pnpm ${args.join(' ')}\n`);
  // SIGINT first: Playwright's graceful interrupt closes browsers and anything it launched in other groups.
  const test = spawnOwned('pnpm', args, {
    env: testEnvironment(runtimeEnv, baseUrl),
    stdio: ['ignore', 'inherit', 'inherit'],
    stopSignals: ['SIGINT', 'SIGTERM'],
  });
  const testCode = outcomeCode(await waitOwned(test, deadline), 'playwright');
  await stopOwned(test);

  const after = listenerPids(options.port);
  if (after.length && !listenersOwnedBy(after, server.pgid, pgidOf)) {
    throw new EnvironmentFailure(`listener identity on port ${options.port} changed during the run`);
  }
  return testCode;
}

async function main() {
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);
  process.on('SIGHUP', onInterrupt);

  const state = { head: undefined, server: undefined };
  let options;
  let code;
  try {
    options = parseArgs(process.argv.slice(2));
    code = await run(options, state);
  } catch (error) {
    if (!(error instanceof EnvironmentFailure)) console.error(error instanceof Error ? error.stack : String(error));
    console.error(`owned-server-check: environment: ${error instanceof Error ? error.message : String(error)}`);
    code = ENVIRONMENT_EXIT;
  } finally {
    await stopAllOwned();
  }

  if (state.server && options) {
    const freeBy = Date.now() + 5_000;
    let remaining = listenerPids(options.port);
    while (remaining.length && Date.now() < freeBy) {
      await delay(200);
      remaining = listenerPids(options.port);
    }
    if (remaining.length) {
      console.error(`owned-server-check: environment: port ${options.port} still has listeners ${remaining.join(',')} after cleanup`);
      code = ENVIRONMENT_EXIT;
    }
  }
  if (interruptReason && code !== ENVIRONMENT_EXIT) code = ENVIRONMENT_EXIT;

  const exitCode = mapExitCode(code, { bisect: options?.bisect ?? process.argv.includes('--bisect') });
  process.stdout.write(`${summaryLine({ config: options?.config, head: state.head, port: options?.port, code, exitCode })}\n`);
  process.exit(exitCode);
}

/** One `git bisect run` step, run from a copy pinned outside the checkout (see the header). */
async function bisectStep(argv) {
  const skip = (reason) => {
    console.error(`owned-server-check: bisect skip: ${reason}`);
    process.exit(BISECT_SKIP_EXIT);
  };
  const forwarded = bisectForwardArgs(argv);
  let options;
  try {
    options = parseArgs(forwarded);
  } catch (error) {
    skip(error instanceof Error ? error.message : String(error));
  }
  const missing = bisectPrerequisitesMissing(options);
  if (missing.length) skip(`revision lacks ${missing.join(', ')}`);

  const install = spawn('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { stdio: ['ignore', 2, 2], shell: false });
  const installCode = await new Promise((resolveInstall) => {
    install.once('error', () => resolveInstall(null));
    install.once('exit', (code) => resolveInstall(code));
  });
  if (installCode !== 0) skip(`pnpm install --frozen-lockfile exited ${installCode}`);

  const pinned = fileURLToPath(import.meta.url);
  const child = spawn(
    process.execPath,
    [
      '--env-file-if-exists=.env',
      '--env-file-if-exists=.env.local',
      TEST_DATABASE_WRAPPER,
      process.execPath,
      pinned,
      ...forwarded,
      '--any-head',
      '--bisect',
    ],
    { stdio: ['ignore', 'pipe', 'inherit'], shell: false },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
    process.stdout.write(chunk);
  });
  await new Promise((resolveChild) => {
    child.once('error', resolveChild);
    child.once('close', resolveChild);
  });
  const exitCode = bisectStepExit(output);
  process.stdout.write(`owned-server-check: bisect step exit=${exitCode}\n`);
  process.exit(exitCode);
}

// Real paths: a pinned copy usually lives under a symlinked temp directory (macOS /var → /private/var).
const invokedDirectly = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  if (process.argv[2] === 'bisect-step') bisectStep(process.argv.slice(3));
  else main();
}
