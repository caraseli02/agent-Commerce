#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);

const sourceExtensions = new Set(['.js', '.mjs', '.ts', '.vue']);
const ignoredDirectories = new Set(['.git', '.husky', '.nuxt', '.output', 'coverage', 'dist', 'node_modules']);

const approvedAuthHeaderPaths = ['plugins/api.ts', 'composables/api/'];

const legacyAuthHeaderExceptions = new Map([
  [
    'utils/categories.ts',
    {
      allowedMatches: 1,
      reason: 'legacy category helper still owns one raw authenticated request until it is migrated to the API plugin/service layer',
    },
  ],
]);

function toRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function isApprovedAuthHeaderLocation(relativePath) {
  return approvedAuthHeaderPaths.some((approvedPath) => {
    if (approvedPath.endsWith('/')) {
      return relativePath.startsWith(approvedPath);
    }

    return relativePath === approvedPath;
  });
}

function lineHasBearerAuthorization(line) {
  return /Authorization/.test(line) && /Bearer\s+/.test(line);
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectSourceFiles(fullPath)));
      }
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function findAuthHeaderViolations(relativePath, contents) {
  const lines = contents.split(/\r?\n/);
  const matches = [];

  for (const [index, line] of lines.entries()) {
    if (lineHasBearerAuthorization(line)) {
      matches.push({
        lineNumber: index + 1,
        text: line.trim(),
      });
    }
  }

  if (isApprovedAuthHeaderLocation(relativePath)) {
    return { violations: [], legacyMatches: [] };
  }

  const legacyException = legacyAuthHeaderExceptions.get(relativePath);
  if (legacyException) {
    return {
      violations: matches.slice(legacyException.allowedMatches),
      legacyMatches: matches.slice(0, legacyException.allowedMatches).map((match) => ({
        ...match,
        reason: legacyException.reason,
      })),
    };
  }

  return { violations: matches, legacyMatches: [] };
}

async function main() {
  const files = await collectSourceFiles(rootDir);
  const violations = [];
  const legacyMatches = [];

  for (const file of files) {
    const relativePath = toRelative(file);
    const contents = await readFile(file, 'utf8');
    const result = findAuthHeaderViolations(relativePath, contents);

    violations.push(...result.violations.map((violation) => ({ relativePath, ...violation })));
    legacyMatches.push(...result.legacyMatches.map((match) => ({ relativePath, ...match })));
  }

  for (const match of legacyMatches) {
    console.warn(
      `architecture invariant warning: ${match.relativePath}:${match.lineNumber} is a known legacy auth-header exception (${match.reason}).`
    );
  }

  if (violations.length > 0) {
    console.error('Architecture invariant failed: manual bearer auth headers are only allowed in plugins/api.ts or composables/api/.');
    console.error(
      'Why it matters: ECAS routes authenticated API traffic through the canonical API client so token attachment and 401 handling stay consistent.'
    );
    console.error(
      'Where to look next: move the request into plugins/api.ts, composables/api/, or a service that uses the injected $api/$apiClient layer instead of hand-building auth headers.'
    );

    for (const violation of violations) {
      console.error(`- ${violation.relativePath}:${violation.lineNumber} contains forbidden manual auth header: ${violation.text}`);
    }

    process.exit(1);
  }

  console.log(
    `Architecture invariants OK: scanned ${files.length} source file(s); manual Bearer auth headers are confined to approved API boundary files.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
