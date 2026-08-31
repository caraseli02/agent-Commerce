import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const walkTsFiles = (root: string): string[] => {
  if (!existsSync(root)) return [];

  return readdirSync(root).flatMap((entry) => {
    const absolutePath = resolve(root, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) return walkTsFiles(absolutePath);
    return /\.(?:ts|mts|cts)$/.test(entry) ? [absolutePath] : [];
  });
};

const repoRelative = (absolutePath: string) => relative(repoRoot, absolutePath).split(sep).join('/');
const domainInternalPattern = /server\/domain\/([^/'"]+)\/internal/;

const findInternalDomainImport = (absolutePath: string) => {
  const match = readFileSync(absolutePath, 'utf8').match(domainInternalPattern);
  return match?.[1] ?? null;
};

describe('server domain boundaries', () => {
  it('keeps API and application workflows off domain internals', () => {
    const protectedRoots = [resolve(repoRoot, 'server/api'), resolve(repoRoot, 'server/application')];
    const offenders = protectedRoots.flatMap(walkTsFiles).flatMap((absolutePath) => {
      const targetDomain = findInternalDomainImport(absolutePath);
      return targetDomain ? [{ file: repoRelative(absolutePath), targetDomain }] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('prevents one domain package from importing another domain internal implementation', () => {
    const domainRoot = resolve(repoRoot, 'server/domain');
    const offenders = walkTsFiles(domainRoot).flatMap((absolutePath) => {
      const file = repoRelative(absolutePath);
      const sourceDomain = file.split('/')[2];
      const targetDomain = findInternalDomainImport(absolutePath);

      return targetDomain && targetDomain !== sourceDomain ? [{ file, sourceDomain, targetDomain }] : [];
    });

    expect(offenders).toEqual([]);
  });
});

describe('checkout workflow contracts to activate during implementation', () => {
  it.todo(
    'payment finalization is idempotent and monotonic: duplicate or late provider success events settle the order at most once and stale events cannot regress a terminal payment state',
  );

  it.todo(
    'cancellation waits for payment truth: a processing payment does not cause immediate inventory release/final cancellation, and a later success is compensated or refunded before cancellation completes',
  );
});
