import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';

it('the supported completed Preview build emits the gate before every ISR destination', async () => {
  const root = process.cwd();
  const folder = await mkdtemp(join(tmpdir(), 'catalog-preview-build-'));
  try {
    // Build the actual checked-out config/wrapper, including the working patch,
    // outside this checkout so generated artifacts cannot invalidate receipts.
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root })
      .toString()
      .split('\0')
      .filter(Boolean);
    for (const file of new Set(files)) {
      if (!(await lstat(join(root, file))).isFile()) continue;
      await mkdir(dirname(join(folder, file)), { recursive: true });
      await copyFile(join(root, file), join(folder, file));
    }
    await symlink(join(root, 'node_modules'), join(folder, 'node_modules'), 'dir');
    execFileSync(process.execPath, ['scripts/build-with-tailwind-guard.mjs'], {
      cwd: folder,
      env: {
        ...process.env,
        PATH: `${join(root, 'node_modules/.bin')}:${process.env.PATH}`,
        VERCEL_ENV: 'preview',
        NITRO_PRESET: 'vercel',
        NUXT_PUBLIC_MOCK_MODE: 'true',
      },
      timeout: 180_000,
      maxBuffer: 10_000_000,
    });
    const output = join(folder, '.vercel/output');
    const config = JSON.parse(await readFile(join(output, 'config.json'), 'utf8'));
    expect(config.routes[0]).toEqual({ src: '^/.*$', middlewarePath: 'catalog-gate', continue: true });
    const filesystem = config.routes.findIndex((route: { handle?: string }) => route.handle === 'filesystem');
    expect(filesystem).toBeGreaterThan(0);
    const cached = config.routes.filter((route: { dest?: string }) => route.dest?.includes('-isr?'));
    expect(cached).toHaveLength(4);
    for (const route of cached) {
      expect(route.caseSensitive).toBe(true);
      expect(route.methods).toEqual(['GET', 'HEAD']);
      const alias = route.dest.split('?')[0];
      expect(JSON.parse(await readFile(join(output, 'functions', alias + '.prerender-config.json'), 'utf8'))).toEqual({
        expiration: 30,
        allowQuery: ['__isr_route'],
        passQuery: true,
      });
    }
    expect(await readFile(join(output, 'functions/catalog-gate.func/index.mjs'), 'utf8')).toBe(
      await readFile(join(root, 'server/catalog-isr-policy.mjs'), 'utf8'),
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}, 240_000);
