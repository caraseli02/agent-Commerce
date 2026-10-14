import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BASE_URL_VARIABLES,
  BISECT_SKIP_EXIT,
  CONFIGS,
  ENVIRONMENT_EXIT,
  EnvironmentFailure,
  TEST_DATABASE_WRAPPER,
  bisectForwardArgs,
  bisectPrerequisitesMissing,
  bisectStepExit,
  buildListArgs,
  listedTestCount,
  buildPlaywrightArgs,
  listenersOwnedBy,
  mapExitCode,
  parseArgs,
  resultLabel,
  summaryLine,
  testEnvironment,
  validateDatabaseUrl,
} from '../scripts/owned-server-check.mjs';

const exists = () => true;
const missing = () => false;
const parse = (argv: string[], fileExists = exists) => parseArgs(argv, { fileExists });
const SCHEMA = 'ecas_test_0123456789abcdef0123456789abcdef';
const wrapped = (host: string) => `postgresql://app:secret@${host}:5432/app?options=${encodeURIComponent(`-c search_path=${SCHEMA}`)}`;

describe('parseArgs', () => {
  it('returns defaults for the minimal invocation', () => {
    expect(parse(['--config', 'e2e'])).toEqual({
      config: 'e2e',
      grep: undefined,
      minutes: 40,
      port: 3205,
      anyHead: false,
      bisect: false,
      specs: [],
    });
  });

  it('reads every supported flag and spec path', () => {
    expect(
      parse([
        '--config',
        'parity',
        '--grep',
        'M1|cart checkout',
        '--minutes',
        '12',
        '--port',
        '3210',
        '--any-head',
        '--bisect',
        'tests/parity/cart.spec.ts',
        'tests/e2e/guest-checkout.spec.ts',
      ]),
    ).toEqual({
      config: 'parity',
      grep: 'M1|cart checkout',
      minutes: 12,
      port: 3210,
      anyHead: true,
      bisect: true,
      specs: ['tests/parity/cart.spec.ts', 'tests/e2e/guest-checkout.spec.ts'],
    });
  });

  it('accepts each locked config and nothing else', () => {
    for (const name of Object.keys(CONFIGS)) expect(parse(['--config', name]).config).toBe(name);
    expect(() => parse(['--config', 'visual'])).toThrow(EnvironmentFailure);
    expect(() => parse(['--config', 'playwright.config.ts'])).toThrow(/--config must be one of/);
    expect(() => parse(['--config', '__proto__'])).toThrow(/--config must be one of/);
  });

  it('requires --config', () => {
    expect(() => parse([])).toThrow(/--config is required/);
    expect(() => parse(['tests/e2e/a.spec.ts'])).toThrow(/--config is required/);
  });

  it('rejects unknown, inline-valued and duplicate flags', () => {
    expect(() => parse(['--config', 'e2e', '--update-snapshots'])).toThrow(/unknown flag --update-snapshots/);
    expect(() => parse(['--config', 'e2e', '--project', 'chromium'])).toThrow(/unknown flag --project/);
    expect(() => parse(['--config=e2e'])).toThrow(/unknown flag --config=e2e/);
    expect(() => parse(['--config', 'e2e', '-u'])).toThrow(/unknown flag -u/);
    expect(() => parse(['--config', 'e2e', '--config', 'parity'])).toThrow(/duplicate flag --config/);
    expect(() => parse(['--config', 'e2e', '--bisect', '--bisect'])).toThrow(/duplicate flag --bisect/);
  });

  it('rejects flags with a missing or flag-looking value', () => {
    expect(() => parse(['--config'])).toThrow(/--config needs a value/);
    expect(() => parse(['--config', 'e2e', '--grep'])).toThrow(/--grep needs a value/);
    expect(() => parse(['--config', 'e2e', '--grep', ''])).toThrow(/--grep needs a value/);
    expect(() => parse(['--config', 'e2e', '--grep', '--any-head'])).toThrow(/--grep needs a value/);
    expect(() => parse(['--config', 'e2e', '--port', '--bisect'])).toThrow(/--port needs a value/);
  });

  it('bounds port and minutes to integers in range', () => {
    expect(parse(['--config', 'e2e', '--port', '1024']).port).toBe(1024);
    expect(parse(['--config', 'e2e', '--port', '65535']).port).toBe(65535);
    expect(parse(['--config', 'e2e', '--minutes', '1']).minutes).toBe(1);
    expect(parse(['--config', 'e2e', '--minutes', '45']).minutes).toBe(45);
    for (const port of ['1023', '65536', '80', '3205.5', '0x0c85', '1e4', ' 3205']) {
      expect(() => parse(['--config', 'e2e', '--port', port]), port).toThrow(/--port must be/);
    }
    for (const minutes of ['0', '46', '600', '1.5', 'ten']) {
      expect(() => parse(['--config', 'e2e', '--minutes', minutes]), minutes).toThrow(/--minutes must be/);
    }
    expect(() => parse(['--config', 'e2e', '--minutes', '-5'])).toThrow(/--minutes needs a value/);
  });

  it('rejects shell syntax, traversal and anything outside tests/*.spec.ts as a spec path', () => {
    const rejected = [
      'tests/e2e/a.spec.ts;rm -rf /',
      ';rm -rf ~',
      'tests/e2e/$(touch pwned).spec.ts',
      'tests/e2e/`id`.spec.ts',
      'tests/e2e/a.spec.ts && curl evil',
      'tests/e2e/a.spec.ts|sh',
      'tests/../scripts/x.spec.ts',
      'tests/e2e/../../etc.spec.ts',
      'tests/..spec.ts',
      'tests//e2e/a.spec.ts',
      '/abs/tests/e2e/a.spec.ts',
      './tests/e2e/a.spec.ts',
      'tests/e2e/a.spec.js',
      'tests/e2e/a.ts',
      'app/pages/index.spec.ts',
      'tests/e2e/a b.spec.ts',
      'tests/e2e/a.spec.ts\nrm',
    ];
    for (const path of rejected) expect(() => parse(['--config', 'e2e', path]), path).toThrow(/unsupported spec path/);
  });

  it('requires spec files to exist and deduplicates them', () => {
    expect(() => parse(['--config', 'e2e', 'tests/e2e/nope.spec.ts'], missing)).toThrow(/spec not found/);
    expect(parse(['--config', 'e2e', 'tests/e2e/a.spec.ts', 'tests/e2e/a.spec.ts']).specs).toEqual(['tests/e2e/a.spec.ts']);
  });

  it('checks spec existence against the real working tree by default', () => {
    expect(parseArgs(['--config', 'e2e', 'tests/e2e/guest-checkout.spec.ts']).specs).toEqual(['tests/e2e/guest-checkout.spec.ts']);
    expect(() => parseArgs(['--config', 'e2e', 'tests/e2e/does-not-exist.spec.ts'])).toThrow(/spec not found/);
    expect(() => parseArgs(['--config', 'e2e', 'tests/e2e'])).toThrow(/unsupported spec path/);
  });

  it('accepts ordinary focused grep patterns', () => {
    for (const grep of ['M1', 'guest checkout', 'cart|checkout', '^@smoke', 'order summary$', 'step \\(2\\)', 'a.*b', "user's cart"]) {
      expect(parse(['--config', 'e2e', '--grep', grep]).grep, grep).toBe(grep);
    }
  });

  it('rejects shell syntax in grep patterns', () => {
    const rejected = [
      'M1;rm -rf /',
      ';rm -rf ~',
      '$(rm -rf /)',
      'a$(id)',
      '${HOME}',
      '`id`',
      'a && b',
      'a > /tmp/x',
      'a < b',
      'line\nbreak',
      'x'.repeat(201),
    ];
    for (const grep of rejected)
      expect(() => parse(['--config', 'e2e', '--grep', grep]), grep).toThrow(/--grep contains unsupported characters/);
  });

  it('rejects NUL bytes anywhere', () => {
    expect(() => parse(['--config', 'e2e', 'tests/e2e/a.spec.ts\0'])).toThrow(/invalid argument/);
  });
});

describe('validateDatabaseUrl', () => {
  it('accepts a wrapped database on every local host', () => {
    expect(validateDatabaseUrl(wrapped('localhost'))).toEqual({ host: 'localhost', schema: SCHEMA });
    expect(validateDatabaseUrl(wrapped('127.0.0.1'))).toEqual({ host: '127.0.0.1', schema: SCHEMA });
    expect(validateDatabaseUrl(wrapped('[::1]'))).toEqual({ host: '::1', schema: SCHEMA });
    expect(validateDatabaseUrl(wrapped('localhost').replace('postgresql:', 'postgres:')).host).toBe('localhost');
  });

  it('accepts the exact URL scripts/with-test-database.mjs produces', () => {
    const url = new URL('postgresql://app:secret@localhost:5432/app?sslmode=disable');
    url.searchParams.set('options', `-c search_path=${SCHEMA}`);
    expect(validateDatabaseUrl(url.toString()).schema).toBe(SCHEMA);
  });

  it('rejects a missing or malformed URL', () => {
    expect(() => validateDatabaseUrl(undefined)).toThrow(/DATABASE_URL is not set/);
    expect(() => validateDatabaseUrl('')).toThrow(/DATABASE_URL is not set/);
    expect(() => validateDatabaseUrl('not a url')).toThrow(/not a valid URL/);
    expect(() => validateDatabaseUrl(wrapped('localhost').replace('postgresql:', 'mysql:'))).toThrow(/not a PostgreSQL URL/);
  });

  it('rejects hosted and look-alike hosts', () => {
    for (const host of [
      'ep-cool-1234.eu-central-1.aws.neon.tech',
      'db.example.com',
      'localhost.evil.com',
      '127.0.0.2',
      '10.0.0.5',
      '0.0.0.0',
      '[::2]',
      'evil.com#@localhost',
    ]) {
      expect(() => validateDatabaseUrl(wrapped(host)), host).toThrow(EnvironmentFailure);
    }
  });

  it('rejects a local URL the wrapper did not set', () => {
    expect(() => validateDatabaseUrl('postgresql://app:secret@localhost:5432/app')).toThrow(/no search_path=ecas_test_/);
    expect(() => validateDatabaseUrl(`postgresql://localhost/app?options=${encodeURIComponent('-c search_path=public')}`)).toThrow(
      /no search_path=ecas_test_/,
    );
    expect(() => validateDatabaseUrl(`postgresql://localhost/app?options=${encodeURIComponent('-c search_path=ecas_test_')}`)).toThrow(
      /no search_path=ecas_test_/,
    );
    expect(() => validateDatabaseUrl(`postgresql://localhost/app?note=search_path%3Decas_test_abc`)).toThrow(/no search_path=ecas_test_/);
    expect(() => validateDatabaseUrl(`postgresql://localhost/app?options=${encodeURIComponent('-c search_path=xecas_test_abc')}`)).toThrow(
      /no search_path=ecas_test_/,
    );
  });
});

describe('mapExitCode', () => {
  it('passes codes through without --bisect', () => {
    for (const code of [0, 1, 2, 75, 130]) expect(mapExitCode(code), String(code)).toBe(code);
  });

  it('maps to git bisect run semantics with --bisect', () => {
    expect(mapExitCode(0, { bisect: true })).toBe(0);
    expect(mapExitCode(1, { bisect: true })).toBe(1);
    expect(mapExitCode(ENVIRONMENT_EXIT, { bisect: true })).toBe(BISECT_SKIP_EXIT);
    for (const code of [2, 3, 125, 127, 128, 130]) expect(mapExitCode(code, { bisect: true }), String(code)).toBe(1);
  });

  it('treats a missing or invalid code as an environment failure', () => {
    for (const code of [null, undefined, -1, 256, 1.5, Number.NaN]) {
      expect(mapExitCode(code as number), String(code)).toBe(ENVIRONMENT_EXIT);
      expect(mapExitCode(code as number, { bisect: true }), String(code)).toBe(BISECT_SKIP_EXIT);
    }
  });
});

describe('buildPlaywrightArgs', () => {
  it('locks the config and never updates snapshots', () => {
    expect(buildPlaywrightArgs({ config: 'performance' })).toEqual([
      'exec',
      'playwright',
      'test',
      '--config=playwright.performance.config.ts',
      '--update-snapshots=none',
    ]);
    expect(buildPlaywrightArgs({ config: 'e2e' })[3]).toBe('--config=playwright.config.ts');
    expect(buildPlaywrightArgs({ config: 'parity' })[3]).toBe('--config=playwright.parity.config.ts');
  });

  it('keeps grep as one argv element and appends specs last', () => {
    expect(
      buildPlaywrightArgs({ config: 'e2e', grep: 'guest checkout|cart', specs: ['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts'] }),
    ).toEqual([
      'exec',
      'playwright',
      'test',
      '--config=playwright.config.ts',
      '--update-snapshots=none',
      '--grep=guest checkout|cart',
      'tests/e2e/a.spec.ts',
      'tests/e2e/b.spec.ts',
    ]);
  });

  it('rejects an unknown config', () => {
    expect(() => buildPlaywrightArgs({ config: 'visual' })).toThrow(EnvironmentFailure);
  });

  it('round-trips parsed arguments', () => {
    const options = parse(['--config', 'parity', '--grep', 'M1', 'tests/parity/a.spec.ts']);
    expect(buildPlaywrightArgs(options)).toEqual([
      'exec',
      'playwright',
      'test',
      '--config=playwright.parity.config.ts',
      '--update-snapshots=none',
      '--grep=M1',
      'tests/parity/a.spec.ts',
    ]);
  });
});

describe('testEnvironment', () => {
  it('points every config at the owned server so none starts its own webServer', async () => {
    const env = testEnvironment({ HOST: '127.0.0.1', DATABASE_URL: 'x' }, 'http://127.0.0.1:3205');
    expect(env).toMatchObject({ HOST: '127.0.0.1', DATABASE_URL: 'x' });
    for (const [name, file] of Object.entries(CONFIGS)) {
      const source = await readFile(file, 'utf8');
      const read = [...source.matchAll(/process\.env\.([A-Z_]*BASE_URL)\b/g)].map((match) => match[1]);
      expect(read.length, `${name} reads an external base URL variable`).toBeGreaterThan(0);
      for (const variable of read) {
        expect(BASE_URL_VARIABLES, `${file} reads ${variable}`).toContain(variable);
        expect(env[variable]).toBe('http://127.0.0.1:3205');
      }
      if (source.includes('webServer'))
        expect(source, `${file} webServer must be conditional`).toMatch(/webServer:\s*externalBaseUrl\s*\?\s*undefined/);
    }
  });
});

describe('listenersOwnedBy', () => {
  const groups: Record<number, number> = { 500: 500, 501: 500, 900: 900 };
  const pgidOf = (pid: number) => groups[pid];

  it('accepts the server pid and members of its process group', () => {
    expect(listenersOwnedBy([500], 500, pgidOf)).toBe(true);
    expect(listenersOwnedBy([500, 501], 500, pgidOf)).toBe(true);
  });

  it('rejects no listener, a foreign listener, or a mix', () => {
    expect(listenersOwnedBy([], 500, pgidOf)).toBe(false);
    expect(listenersOwnedBy([900], 500, pgidOf)).toBe(false);
    expect(listenersOwnedBy([500, 900], 500, pgidOf)).toBe(false);
    expect(listenersOwnedBy([777], 500, pgidOf)).toBe(false);
  });
});

describe('summary', () => {
  it('labels results from the unmapped code', () => {
    expect(resultLabel(0)).toBe('pass');
    expect(resultLabel(1)).toBe('fail');
    expect(resultLabel(ENVIRONMENT_EXIT)).toBe('environment');
  });

  it('prints one parseable line', () => {
    expect(summaryLine({ config: 'parity', head: 'abc123', port: 3205, code: 0 })).toBe(
      'owned-server-check: config=parity head=abc123 port=3205 result=pass exit=0',
    );
    expect(summaryLine({ config: 'e2e', head: 'abc123', port: 3205, code: ENVIRONMENT_EXIT, exitCode: BISECT_SKIP_EXIT })).toBe(
      'owned-server-check: config=e2e head=abc123 port=3205 result=environment exit=125',
    );
    expect(summaryLine({ code: ENVIRONMENT_EXIT })).toBe(
      'owned-server-check: config=unknown head=unknown port=unknown result=environment exit=75',
    );
  });
});

describe('bisect step', () => {
  it('lists the wrapper, config and specs a historical revision lacks', () => {
    const has = (present: string[]) => (path: string) => present.includes(path);
    expect(bisectPrerequisitesMissing({ config: 'parity', specs: [] }, has([TEST_DATABASE_WRAPPER, CONFIGS.parity]))).toEqual([]);
    expect(bisectPrerequisitesMissing({ config: 'parity', specs: [] }, has([CONFIGS.parity]))).toEqual([TEST_DATABASE_WRAPPER]);
    expect(bisectPrerequisitesMissing({ config: 'performance', specs: ['tests/a.spec.ts'] }, has([TEST_DATABASE_WRAPPER]))).toEqual([
      CONFIGS.performance,
      'tests/a.spec.ts',
    ]);
  });

  it('forwards everything but the flags the step adds itself', () => {
    expect(bisectForwardArgs(['--config', 'parity', '--any-head', '--grep', 'M1', '--bisect'])).toEqual([
      '--config',
      'parity',
      '--grep',
      'M1',
    ]);
  });

  it('is bad only for the check’s own result=fail summary and good only for result=pass exit=0', () => {
    const line = (result: string, exit: number) => `owned-server-check: config=parity head=abc port=3205 result=${result} exit=${exit}`;
    expect(bisectStepExit(`building\n${line('pass', 0)}\n`)).toBe(0);
    expect(bisectStepExit(`${line('fail', 1)}\n`)).toBe(1);
    expect(bisectStepExit(`${line('environment', 125)}\n`)).toBe(BISECT_SKIP_EXIT);
    // Missing tooling: the wrapper or node dies before any summary line (MODULE_NOT_FOUND and similar).
    expect(bisectStepExit("Error: Cannot find module '/repo/scripts/owned-server-check.mjs'\n")).toBe(BISECT_SKIP_EXIT);
    expect(bisectStepExit('')).toBe(BISECT_SKIP_EXIT);
    expect(bisectStepExit(`  ${line('fail', 1)} trailing`)).toBe(BISECT_SKIP_EXIT);
  });

  it('skips (125) a revision that predates the helper, from a pinned copy outside the checkout', async () => {
    const pin = await mkdtemp(join(tmpdir(), 'owned-pin-'));
    const revision = await mkdtemp(join(tmpdir(), 'owned-old-revision-'));
    try {
      const pinned = join(pin, 'owned-server-check.mjs');
      await copyFile(resolve('scripts/owned-server-check.mjs'), pinned);
      const step = (args: string[]) => spawnSync(process.execPath, [pinned, 'bisect-step', ...args], { cwd: revision, encoding: 'utf8' });

      // No wrapper, no config, no scripts/owned-server-check.mjs: the old checkout has none of the new tooling.
      const bare = step(['--config', 'parity', '--grep', 'M1', '--port', '3207']);
      expect(bare.status).toBe(BISECT_SKIP_EXIT);
      expect(bare.stderr).toMatch(/bisect skip: revision lacks scripts\/with-test-database\.mjs, playwright\.parity\.config\.ts/);

      // A spec the issue names that the old revision does not have yet.
      await mkdir(join(revision, 'scripts'));
      await writeFile(join(revision, TEST_DATABASE_WRAPPER), '');
      await writeFile(join(revision, CONFIGS.parity), '');
      expect(step(['--config', 'parity', 'tests/new.spec.ts']).status).toBe(BISECT_SKIP_EXIT);

      // Prerequisites present but dependencies cannot be installed (no package.json at that revision).
      const noInstall = step(['--config', 'parity', '--port', '3207']);
      expect(noInstall.status).toBe(BISECT_SKIP_EXIT);
      expect(noInstall.stderr).toMatch(/bisect skip: pnpm install/);
    } finally {
      await rm(pin, { recursive: true, force: true });
      await rm(revision, { recursive: true, force: true });
    }
  });
});

describe('selected tests', () => {
  it('lists with the same locked selection', () => {
    expect(buildListArgs({ config: 'parity', grep: 'M1', specs: ['tests/a.spec.ts'] })).toEqual([
      'exec',
      'playwright',
      'test',
      '--list',
      '--config=playwright.parity.config.ts',
      '--update-snapshots=none',
      '--grep=M1',
      'tests/a.spec.ts',
    ]);
  });

  it('reads the listed total, and nothing from unrelated output', () => {
    expect(listedTestCount('  [chromium] › a.spec.ts:1:1 › x\nTotal: 6 tests in 1 file\n')).toBe(6);
    expect(listedTestCount('Total: 1 test in 1 file\n')).toBe(1);
    expect(listedTestCount('Error: No tests found\nListing tests:\nTotal: 0 tests in 0 files\n')).toBe(0);
    expect(listedTestCount('Error: Cannot find module\n')).toBeUndefined();
  });

  it('skips a historical revision whose config exists but lacks the selected test title (command level)', () => {
    // Real config and spec, a title no revision has: the check must stop before building, as an environment failure.
    const result = spawnSync(
      process.execPath,
      [
        'scripts/owned-server-check.mjs',
        '--config',
        'parity',
        '--grep',
        'HistoricallyAbsentReviewProbe',
        '--any-head',
        '--bisect',
        '--port',
        '3298',
      ],
      { encoding: 'utf8', env: { ...process.env, DATABASE_URL: wrapped('127.0.0.1'), DATABASE_URL_UNPOOLED: '' }, timeout: 120_000 },
    );
    expect(result.stderr).toMatch(/no selected tests at this revision \(playwright --list exit 1, 0 tests\)/);
    expect(result.stdout).not.toMatch(/building/);
    expect(result.stdout).toMatch(/result=environment exit=125$/m);
    expect(result.status).toBe(BISECT_SKIP_EXIT);
    expect(bisectStepExit(result.stdout)).toBe(BISECT_SKIP_EXIT);
  }, 130_000);
});
