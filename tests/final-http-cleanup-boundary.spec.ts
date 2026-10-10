import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const sourceRoots = ['app/components', 'app/composables', 'app/pages', 'app/plugins', 'app/store'];
const deletedPaths = [
  `app/composables/${['Http', 'Factory'].join('')}.ts`,
  `app/composables/${['use', 'Fetch', 'API'].join('')}.ts`,
  ['serv', 'ices'].join(''),
];
const dashboardOrderSurfacePaths = [
  'app/pages/dashboard/orders/[id].vue',
  'app/components/admin-table/order/Order.vue',
  'app/components/client-table/order/Index.vue',
  'app/components/dashboard/orders/InfoCards.vue',
];
const legacyDomainApiPattern =
  /\$api\.(cart|auth|product|orders|categories|user|favouriteFolder|notifications|generalSettings|userDashboard|controlPanel|customerDashboard|settingsClient|customerProfile|smartPricing|documents)\b/;
const legacyRegistryPattern = new RegExp(
  `\\b(${['I', 'Api', 'Instance'].join('')}|${['Http', 'Factory'].join('')}|${['use', 'Fetch', 'API'].join('')})\\b`,
);
const directApiClientPattern =
  /(?:const\s*\{\s*\$apiClient\s*\}\s*=\s*useNuxtApp\(\)|useNuxtApp\(\)\.\$apiClient|(?:getOrderById|fetchOrders)\([^\n]*,\s*\$apiClient\))/;

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

      if (!/\.(ts|vue)$/.test(entry.name)) {
        return [];
      }

      return [path];
    }),
  );

  return files.flat();
}

async function pathExists(path: string): Promise<boolean> {
  return await readdir(path)
    .then(() => true)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOTDIR') {
        return true;
      }

      if (error.code === 'ENOENT') {
        return false;
      }

      throw error;
    });
}

describe('final HTTP migration cleanup boundary', () => {
  it('removes legacy service registry files and app-code references', async () => {
    const files = (await Promise.all(sourceRoots.map((root) => collectSourceFiles(join(repoRoot, root))))).flat();
    expect(files.length).toBeGreaterThan(0);

    const existingDeletedPaths = (
      await Promise.all(
        deletedPaths.map(async (path) => ({
          path,
          exists: await pathExists(join(repoRoot, path)),
        })),
      )
    )
      .filter((entry) => entry.exists)
      .map((entry) => entry.path);
    const offenders: string[] = [];

    for (const file of files) {
      const contents = await readFile(file, 'utf8');

      if (legacyDomainApiPattern.test(contents) || legacyRegistryPattern.test(contents)) {
        offenders.push(relative(repoRoot, file));
      }
    }

    expect({
      existingDeletedPaths,
      offenders,
    }).toEqual({
      existingDeletedPaths: [],
      offenders: [],
    });
  });

  it('keeps dashboard order surfaces behind composable adapters', async () => {
    const offenders: string[] = [];

    for (const path of dashboardOrderSurfacePaths) {
      const contents = await readFile(join(repoRoot, path), 'utf8');

      if (directApiClientPattern.test(contents)) {
        offenders.push(path);
      }
    }

    expect(offenders).toEqual([]);
  });
});
