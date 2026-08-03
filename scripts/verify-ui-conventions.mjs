#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);

const sourceExtensions = new Set(['.vue']);
const ignoredDirectories = new Set(['.git', '.husky', '.nuxt', '.output', 'coverage', 'dist', 'node_modules']);

/** @type {Set<string>} */
export const grandfatheredLegacyModalFiles = new Set([]);

const nativeInteractivePattern = /<(button|input)(?:\s|>|\/)/g;

function toRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

/**
 * @param {string} relativePath
 */
export function isScopedModalUiFile(relativePath) {
  if (!relativePath.endsWith('.vue')) {
    return false;
  }

  const normalized = relativePath.split(path.sep).join('/');
  const fileName = path.posix.basename(normalized);

  if (/Modal/i.test(fileName)) {
    return true;
  }

  return normalized.startsWith('components/layout/') && /modal/i.test(normalized);
}

/**
 * @param {string} contents
 */
export function extractVueTemplate(contents) {
  const match = contents.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
  return match?.[1] ?? '';
}

/**
 * @param {string} template
 */
export function stripHtmlComments(template) {
  return template.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * @param {string} template
 */
export function findNativeInteractiveElements(template) {
  const sanitized = stripHtmlComments(template);
  const matches = [];

  for (const match of sanitized.matchAll(nativeInteractivePattern)) {
    const index = match.index ?? 0;
    const before = sanitized.slice(Math.max(0, index - 2), index);
    if (before.endsWith('Ui')) {
      continue;
    }

    const lineNumber = sanitized.slice(0, index).split(/\r?\n/).length;
    matches.push({
      tag: match[1],
      lineNumber,
      snippet: sanitized
        .slice(index, index + 80)
        .split(/\r?\n/)[0]
        .trim(),
    });
  }

  return matches;
}

/**
 * @param {string} relativePath
 * @param {string} contents
 */
export function inspectModalUiFile(relativePath, contents) {
  if (!isScopedModalUiFile(relativePath)) {
    return { relativePath, scoped: false, grandfathered: false, violations: [] };
  }

  const grandfathered = grandfatheredLegacyModalFiles.has(relativePath);
  const template = extractVueTemplate(contents);
  const violations = findNativeInteractiveElements(template).map((violation) => ({
    ...violation,
    relativePath,
  }));

  return {
    relativePath,
    scoped: true,
    grandfathered,
    violations: grandfathered ? [] : violations,
  };
}

async function collectVueFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await collectVueFiles(fullPath)));
      }
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = await collectVueFiles(rootDir);
  const violations = [];
  let scopedCount = 0;
  let grandfatheredCount = 0;

  for (const file of files) {
    const relativePath = toRelative(file);
    const contents = await readFile(file, 'utf8');
    const result = inspectModalUiFile(relativePath, contents);

    if (!result.scoped) {
      continue;
    }

    scopedCount += 1;
    if (result.grandfathered) {
      grandfatheredCount += 1;
      continue;
    }

    violations.push(...result.violations);
  }

  if (violations.length > 0) {
    console.error(
      'UI conventions failed: modal and layout modal surfaces must use shadcn primitives (UiButton, UiInput, UiDialog) instead of native <button> or <input>.'
    );
    console.error(
      'Why it matters: new modal work should follow the design system so accessibility, theming, and dialog behavior stay consistent.'
    );
    console.error(
      'Where to look next: replace native elements with UiButton/UiInput/UiDialog, or add the file to scripts/verify-ui-conventions.mjs only when it is an approved legacy exception tracked by an open migration issue.'
    );

    for (const violation of violations) {
      console.error(`- ${violation.relativePath}:${violation.lineNumber} uses native <${violation.tag}>: ${violation.snippet}`);
    }

    process.exit(1);
  }

  console.log(
    `UI conventions OK: scanned ${scopedCount} scoped modal file(s); ${grandfatheredCount} legacy file(s) grandfathered; no new native <button>/<input> violations.`
  );
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
