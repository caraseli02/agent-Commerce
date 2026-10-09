import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const sourceRoots = [
  'app/components',
  'app/composables',
  'app/config',
  'data',
  'helpers',
  'app/layouts',
  'app/lib',
  'app/middleware',
  'modules',
  'app/pages',
  'app/plugins',
  'server',
  'services',
  'app/store',
  'types',
  'app/utils',
];
const legacyCartImport = /['"][^'"]*model\/cart(?:\/|['"])/;

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectSourceFiles(path);
      }

      return /\.(ts|vue)$/.test(entry.name) ? [path] : [];
    }),
  );

  return files.flat();
}

describe('cart type namespace boundary', () => {
  it('keeps application imports on the canonical cart namespace', async () => {
    const files = (await Promise.all(sourceRoots.map((root) => collectSourceFiles(join(repoRoot, root))))).flat();
    const offenders: string[] = [];

    for (const file of files) {
      const contents = await readFile(file, 'utf8');

      if (legacyCartImport.test(contents)) {
        offenders.push(relative(repoRoot, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps the legacy cart modules as compatibility re-exports', async () => {
    const requestModule = await readFile(join(repoRoot, 'model/cart/request/cart.interface.ts'), 'utf8');
    const responseModule = await readFile(join(repoRoot, 'model/cart/response/cart.interface.ts'), 'utf8');

    expect(requestModule).toContain("export * from '~~/types/cart/request'");
    expect(responseModule).toContain("export * from '~~/types/cart/response'");
  });
});
