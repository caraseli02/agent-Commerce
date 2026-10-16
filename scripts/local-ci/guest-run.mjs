#!/usr/bin/env node
// Installed in the trusted image as root; never loaded from the PR checkout.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let job;
let merge = '0000000000000000000000000000000000000000';
let exit = 2;
let detail = 'Guest infrastructure failure';
const run = (program, args, options = {}) => {
  const result = spawnSync(program, args, {
    stdio: 'inherit',
    env: {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      HOME: '/root',
      LANG: 'C.UTF-8',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      ...options.env,
    },
    ...options,
  });
  if (result.status !== 0) throw new Error(`${program} failed`);
  return result;
};
try {
  run('/usr/bin/mount', ['-o', 'ro,nosuid,nodev,noexec', '/dev/vdb', '/ci-input']);
  job = JSON.parse(readFileSync('/ci-input/job.json', 'utf8'));
  if (!/^[a-f0-9-]{36}$/.test(job.id) || !/^[a-f0-9]{40}$/.test(job.head) || !/^[a-f0-9]{40}$/.test(job.base))
    throw new Error('Invalid guest manifest');
  // Reject an unexpectedly networked image even though the host config has no NIC.
  const net = spawnSync('/usr/bin/find', ['/sys/class/net', '-mindepth', '1', '-maxdepth', '1', '!', '-name', 'lo'], { encoding: 'utf8' });
  if (net.status !== 0 || net.stdout.trim()) throw new Error('Unexpected guest network interface');
  run('/usr/bin/git', ['-c', 'core.hooksPath=/dev/null', 'clone', '--no-checkout', '/ci-input/source.bundle', '/ci/repo']);
  run('/usr/bin/git', ['-C', '/ci/repo', 'checkout', '--detach', job.base]);
  const merged = spawnSync(
    '/usr/bin/git',
    [
      '-C',
      '/ci/repo',
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'user.name=Local CI',
      '-c',
      'user.email=local-ci@invalid',
      'merge',
      '--no-ff',
      '--no-edit',
      job.head,
    ],
    {
      stdio: 'inherit',
      env: {
        PATH: '/usr/bin:/bin',
        HOME: '/root',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z',
        GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z',
      },
    },
  );
  merge = spawnSync('/usr/bin/git', ['-C', '/ci/repo', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  if (merged.status !== 0) {
    exit = 1;
    detail = 'Head does not merge into the requested base';
  } else {
    // The only database is inside this disposable disk; PR environment files are replaced.
    const env =
      'NUXT_PUBLIC_MOCK_MODE=true\nPAYMENTS_PROVIDER=mock\nSTRIPE_GATE_A_APPROVED=false\nDATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/ci\n';
    for (const path of ['/ci/repo/.env', '/ci/repo/.env.local']) {
      rmSync(path, { force: true, recursive: true });
      writeFileSync(path, env, { flag: 'wx', mode: 0o600 });
    }
    run('/usr/bin/chown', ['-R', 'ci:ci', '/ci']);
    run('/usr/bin/systemctl', ['start', 'postgresql']);
    const install = spawnSync(
      '/usr/sbin/runuser',
      [
        '-u',
        'ci',
        '--',
        '/usr/bin/env',
        '-i',
        'HOME=/ci',
        'PATH=/usr/local/bin:/usr/bin:/bin',
        'CI=true',
        'NUXT_PUBLIC_MOCK_MODE=true',
        'PAYMENTS_PROVIDER=mock',
        'STRIPE_GATE_A_APPROVED=false',
        'DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/ci',
        'pnpm',
        'install',
        '--offline',
        '--frozen-lockfile',
        '--store-dir=/opt/ci-store',
      ],
      { cwd: '/ci/repo', stdio: 'inherit' },
    );
    if (install.status !== 0) {
      exit = 2;
      detail = 'Offline dependency installation failed; refresh trusted image for this lockfile';
    } else {
      const verify = spawnSync(
        '/usr/sbin/runuser',
        [
          '-u',
          'ci',
          '--',
          '/usr/bin/env',
          '-i',
          'HOME=/ci',
          'PATH=/usr/local/bin:/usr/bin:/bin',
          'CI=true',
          'NUXT_PUBLIC_MOCK_MODE=true',
          'PAYMENTS_PROVIDER=mock',
          'STRIPE_GATE_A_APPROVED=false',
          'DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/ci',
          'pnpm',
          'verify:full',
          '--fresh',
        ],
        { cwd: '/ci/repo', stdio: 'inherit' },
      );
      exit = verify.status === 0 ? 0 : 1;
      detail = exit === 0 ? 'Fresh full gate passed' : 'Full gate failed';
    }
  }
} catch (error) {
  detail = error.message;
} finally {
  // hvc1 is root-only, has no getty and is distinct from PR stdout/stderr (hvc0).
  if (job)
    writeFileSync('/dev/hvc1', `LOCAL_CI_RESULT ${JSON.stringify({ id: job.id, head: job.head, base: job.base, merge, exit, detail })}\n`);
  spawnSync('/usr/sbin/poweroff', ['-f']);
}
