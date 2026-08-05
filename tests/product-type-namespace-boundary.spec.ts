import { readdir, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const sourceRoots = [
  'components',
  'composables',
  'config',
  'data',
  'helpers',
  'layouts',
  'lib',
  'middleware',
  'modules',
  'pages',
  'plugins',
  'server',
  'services',
  'store',
  'types',
  'utils',
];
const legacyProductImport = /['"][^'"]*model\/products(?:\/|['"])/;

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
    })
  );

  return files.flat();
}

describe('product type namespace boundary (#404)', () => {
  it('keeps application imports on the canonical product namespace', async () => {
    const files = (await Promise.all(sourceRoots.map((root) => collectSourceFiles(join(repoRoot, root))))).flat();
    const offenders: string[] = [];

    for (const file of files) {
      const contents = await readFile(file, 'utf8');

      if (legacyProductImport.test(contents)) {
        offenders.push(relative(repoRoot, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps deprecated model product paths as re-export shims', () => {
    const productResponseShim = readFileSync(resolve(repoRoot, 'model/products/response/ProductResponse.ts'), 'utf8');
    const productSearchShim = readFileSync(resolve(repoRoot, 'model/products/response/ProductSearchResponse.ts'), 'utf8');
    const newProductShim = readFileSync(resolve(repoRoot, 'model/products/response/NewProductResponse.ts'), 'utf8');
    const similarResponseShim = readFileSync(resolve(repoRoot, 'model/products/response/SearchSimilarProductResponse.ts'), 'utf8');
    const similarRequestShim = readFileSync(resolve(repoRoot, 'model/products/request/SearchSimilarProductRequest.ts'), 'utf8');
    const newProductsShim = readFileSync(resolve(repoRoot, 'model/products/NewProducts.ts'), 'utf8');

    expect(productResponseShim).toContain('@deprecated');
    expect(productResponseShim).toContain("export * from '~/types/product/response'");
    expect(productSearchShim).toContain("export * from '~/types/product/search'");
    expect(newProductShim).toContain("export * from '~/types/product/new-products'");
    expect(similarResponseShim).toContain("export * from '~/types/product/similar'");
    expect(similarRequestShim).toContain("export * from '~/types/product/similar'");
    expect(newProductsShim).toContain("export * from '~/types/product/new-products'");
  });
});
