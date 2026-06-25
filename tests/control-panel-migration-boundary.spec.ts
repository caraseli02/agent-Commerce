import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const sourceRoots = ['components', 'composables', 'pages', 'plugins', 'services'];
const legacyPatterns = [new RegExp(['\\$api', 'controlPanel'].join('\\.')), new RegExp(`\\b${['ControlPanel', 'Service'].join('')}\\b`)];

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
    })
  );

  return files.flat();
}

describe('control-panel HTTP migration boundary', () => {
  it('removes the legacy control-panel service registry from app code', async () => {
    const files = (await Promise.all(sourceRoots.map((root) => collectSourceFiles(join(repoRoot, root))))).flat();
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const file of files) {
      const contents = await readFile(file, 'utf8');

      if (legacyPatterns.some((pattern) => pattern.test(contents))) {
        offenders.push(relative(repoRoot, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
