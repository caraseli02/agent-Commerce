import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const walkTsFiles = (root: string): string[] => {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root).flatMap((entry) => {
    const absolutePath = resolve(root, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return walkTsFiles(absolutePath);
    }

    return /\.(?:ts|mts|cts)$/.test(entry) ? [absolutePath] : [];
  });
};

const source = (absolutePath: string) => readFileSync(absolutePath, 'utf8');
const repoRelative = (absolutePath: string) => relative(repoRoot, absolutePath).split(sep).join('/');

const internalModuleImportPattern = /from\s+['"][^'"]*server\/modules\/([^/'"]+)\/internal(?:\/[^'"]*)?['"]/g;

const findInternalModuleImports = (absolutePath: string) => {
  const matches: string[] = [];
  const contents = source(absolutePath);

  for (const match of contents.matchAll(internalModuleImportPattern)) {
    const targetModule = match[1];
    if (targetModule) {
      matches.push(targetModule);
    }
  }

  return matches;
};

describe('server module boundaries', () => {
  it('keeps API and application workflows off module internals', () => {
    const protectedRoots = [resolve(repoRoot, 'server/api'), resolve(repoRoot, 'server/application')];
    const offenders = protectedRoots
      .flatMap(walkTsFiles)
      .flatMap((absolutePath) =>
        findInternalModuleImports(absolutePath).map((targetModule) => ({
          file: repoRelative(absolutePath),
          targetModule,
        })),
      );

    expect(offenders).toEqual([]);
  });

  it('prevents one server module from importing another module internal implementation', () => {
    const modulesRoot = resolve(repoRoot, 'server/modules');
    const offenders = walkTsFiles(modulesRoot).flatMap((absolutePath) => {
      const file = repoRelative(absolutePath);
      const sourceModule = file.split('/')[2];

      return findInternalModuleImports(absolutePath)
        .filter((targetModule) => targetModule !== sourceModule)
        .map((targetModule) => ({ file, sourceModule, targetModule }));
    });

    expect(offenders).toEqual([]);
  });
});

describe('checkout workflow contracts to activate during implementation', () => {
  it.todo(
    'PlaceOrder is idempotent: retrying the same checkoutRequestId and fingerprint returns the same logical order, while conflicting reuse is rejected and the same cart revision cannot create two active orders',
  );

  it.todo(
    'payment finalization is idempotent and monotonic: duplicate or late provider success events settle the order at most once and stale events cannot regress a terminal payment state',
  );

  it.todo(
    'cancellation waits for payment truth: a processing payment does not cause immediate inventory release/final cancellation, and a later success is compensated or refunded before cancellation completes',
  );
});
