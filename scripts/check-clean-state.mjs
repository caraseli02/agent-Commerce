#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sourceExtensions = new Set(['.js', '.mjs', '.ts', '.vue', '.json']);
const validatorSelfPath = 'scripts/check-clean-state.mjs';
const tempPathPattern = /(^|\/)(tmp|temp|debug|scratch)(\/|$)|\.(log|tmp|bak|orig|swp|swo)$/i;
const consoleLogPattern = /\bconsole\.log\s*\(/;
const todoPattern = /\b(?:TODO|FIXME)\b/;
const commentedCodePattern =
  /^\s*(?:\/\/|\/\*)\s*(?:const|let|var|function|class|if|for|while|return|export|import|[A-Za-z_$][\w$]*\s*=|[A-Za-z_$][\w$]*\s*\()/;

function fail(message) {
  console.error(`clean-state validation failed: ${message}`);
  process.exit(1);
}

async function runGit(args) {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: rootDir,
      maxBuffer: 10_000_000,
      env: process.env,
    });

    return stdout.trim();
  } catch (error) {
    const details = error instanceof Error && 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : null;
    fail(`unable to run git ${args.join(' ')}${details ? `: ${details}` : ''}`);
  }
}

async function getChangedFiles(base) {
  const output = await runGit(['diff', '--name-only', '--diff-filter=ACMR', `${base}..HEAD`]);
  return output ? output.split('\n').filter(Boolean) : [];
}

function isSourceFile(filePath) {
  return sourceExtensions.has(path.extname(filePath)) || filePath === 'package.json';
}

async function scanFile(base, filePath) {
  const diff = await runGit(['diff', '--unified=0', '--no-color', `${base}..HEAD`, '--', filePath]);
  const hits = [];
  let newLineNumber = null;

  for (const line of diff.split(/\r?\n/)) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineNumber = Number(hunkMatch[1]);
      continue;
    }

    if (!line.startsWith('+') || line.startsWith('+++') || newLineNumber === null) {
      continue;
    }

    const addedLine = line.slice(1);
    if (consoleLogPattern.test(addedLine)) {
      hits.push(`${filePath}:${newLineNumber} contains console.log`);
    } else if (todoPattern.test(addedLine)) {
      hits.push(`${filePath}:${newLineNumber} contains TODO/FIXME`);
    } else if (commentedCodePattern.test(addedLine)) {
      hits.push(`${filePath}:${newLineNumber} looks like commented-out code`);
    }

    newLineNumber += 1;
  }

  return hits;
}

async function checkProgressStateShape() {
  const contents = await readFile(path.join(rootDir, 'PROGRESS.md'), 'utf8');
  const requiredHeadings = ['## Current focus', '## In progress', '## Blocked / known baseline failures', '## Verification baseline'];

  const missingHeadings = requiredHeadings.filter((heading) => !contents.includes(heading));
  if (missingHeadings.length > 0) {
    fail(`PROGRESS.md is missing required clean-state sections: ${missingHeadings.join(', ')}.`);
  }

  if (!/^## Current focus\n[\s\S]*?-\s+/m.test(contents)) {
    fail('PROGRESS.md current focus section is empty; the handoff state needs at least one active focus bullet.');
  }

  if (!/^## In progress\n[\s\S]*?-\s+/m.test(contents)) {
    fail('PROGRESS.md in-progress section is empty; the handoff state needs a live task or an explicit none/blocked note.');
  }
}

async function main() {
  const status = await runGit(['status', '--porcelain']);
  if (status) {
    fail(`working tree is not clean. Commit or remove intentional changes before handoff:\n${status}`);
  }

  const base = await runGit(['merge-base', 'origin/main', 'HEAD']);
  const changedFiles = await getChangedFiles(base);
  const trackedTempArtifacts = changedFiles.filter((filePath) => tempPathPattern.test(filePath));
  if (trackedTempArtifacts.length > 0) {
    fail(`tracked temporary/debug artifacts are present in the branch diff: ${trackedTempArtifacts.join(', ')}.`);
  }

  await checkProgressStateShape();

  const scanTargets = changedFiles.filter((filePath) => isSourceFile(filePath) && filePath !== validatorSelfPath);
  const violations = [];

  for (const filePath of scanTargets) {
    violations.push(...(await scanFile(base, filePath)));
  }

  if (violations.length > 0) {
    console.error('clean-state validation failed: changed source files introduced debug or handoff-regression patterns.');
    console.error(
      'Why it matters: handoff validators should catch accidental debug output, stale TODOs, and commented-out code before a PR is handed off.',
    );
    console.error(
      'Where to look next: remove the temporary artifact or replace the commented/debug line with durable code, then rerun the check.',
    );

    for (const violation of violations) {
      console.error(`- ${violation}`);
    }

    process.exit(1);
  }

  process.stdout.write(
    `Clean-state validation OK: no dirty working tree, no tracked temp artifacts, and ${scanTargets.length} changed source file(s) passed the debug-pattern scan.\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
