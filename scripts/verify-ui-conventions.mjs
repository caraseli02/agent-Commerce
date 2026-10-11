#!/usr/bin/env node
/**
 * UI-conventions ratchet (#633).
 *
 * Parses the template of every `.vue` file outside `app/components/ui/` with the Vue SFC compiler and
 * counts native `<button>`, `<input>`, `<label>`, `<textarea>`, `<table>` and `<select>` elements.
 * The per-file, per-tag counts must never exceed `scripts/ui-conventions-baseline.json`, and the
 * baseline must not be stale: when a migration removes native elements, the same commit lowers the
 * baseline with `node scripts/verify-ui-conventions.mjs --update`.
 *
 * An element whose nearest preceding sibling (ignoring whitespace) is `<!-- ui-native: <reason> -->`
 * is an accepted exception and is not counted. The reason must not be empty.
 *
 * Usage:
 *   node scripts/verify-ui-conventions.mjs           check (runs inside pnpm verify)
 *   node scripts/verify-ui-conventions.mjs --update  rewrite the baseline; only lowers counts
 *   node scripts/verify-ui-conventions.mjs --init    create the baseline when it does not exist yet
 */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { parse } from 'vue/compiler-sfc';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export const baselineRelativePath = 'scripts/ui-conventions-baseline.json';
export const updateCommand = 'node scripts/verify-ui-conventions.mjs --update';

/** Native elements that have a `components/ui` primitive. Matched exactly (lowercase), so `<Button>` / `<UiButton>` are components. */
export const nativeTags = Object.freeze(['button', 'input', 'label', 'textarea', 'table', 'select']);
const nativeTagSet = new Set(nativeTags);

/** Path prefix that holds the shadcn-vue primitives themselves; they are allowed to render native elements. */
export const primitivesPrefix = 'app/components/ui/';

const exceptionMarker = /^ui-native:/;
const exceptionWithReason = /^ui-native:\s*(\S[\s\S]*)$/;

// Vue template AST node types (`@vue/compiler-core` NodeTypes).
const ELEMENT = 1;
const TEXT = 2;
const COMMENT = 3;

/**
 * @typedef {{ tag: string, line: number }} NativeElement
 * @typedef {{ tag: string, line: number, reason: string }} NativeException
 * @typedef {{ line: number, message: string }} ScanError
 * @typedef {{ elements: NativeElement[], exceptions: NativeException[], errors: ScanError[] }} FileScan
 * @typedef {Record<string, Record<string, number>>} Counts
 */

/**
 * @param {string} relativePath
 */
export function isScannedVueFile(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return normalized.endsWith('.vue') && !normalized.startsWith(primitivesPrefix);
}

/**
 * Finds native elements in a Vue SFC template. Lines are 1-based and relative to the whole file.
 * Comments, `<script>` blocks, attribute values and interpolations never count because only element
 * nodes of the parsed template AST are inspected.
 *
 * @param {string} relativePath
 * @param {string} contents
 * @returns {FileScan}
 */
export function findNativeElements(relativePath, contents) {
  /** @type {FileScan} */
  const result = { elements: [], exceptions: [], errors: [] };
  // `comments: true` keeps comment nodes regardless of NODE_ENV (the production build drops them by default).
  const { descriptor, errors } = parse(contents, { filename: relativePath, templateParseOptions: { comments: true } });

  for (const error of errors) {
    const line = typeof error === 'object' && error && 'loc' in error && error.loc ? error.loc.start.line : 1;
    result.errors.push({ line, message: `Vue SFC parse error: ${error instanceof Error ? error.message : String(error)}` });
  }

  const template = descriptor.template;
  if (!template) {
    return result;
  }

  if (!template.ast) {
    result.errors.push({
      line: template.loc.start.line,
      message: `cannot scan <template lang="${template.lang}">; only HTML templates are supported`,
    });
    return result;
  }

  visitChildren(template.ast.children, result);
  return result;
}

/**
 * @param {any[]} children
 * @param {FileScan} result
 */
function visitChildren(children, result) {
  /** @type {any} */
  let previous = null;

  for (const node of children) {
    if (node.type === TEXT && !node.content.trim()) {
      continue;
    }

    if (node.type === COMMENT) {
      const content = node.content.trim();
      if (exceptionMarker.test(content) && !exceptionWithReason.test(content)) {
        result.errors.push({
          line: node.loc.start.line,
          message: '`<!-- ui-native: -->` exception has no reason; write `<!-- ui-native: <why the native element must stay> -->`',
        });
      }
    }

    if (node.type === ELEMENT) {
      if (nativeTagSet.has(node.tag)) {
        const reason = previous?.type === COMMENT ? previous.content.trim().match(exceptionWithReason)?.[1]?.trim() : undefined;
        if (reason) {
          result.exceptions.push({ tag: node.tag, line: node.loc.start.line, reason });
        } else {
          result.elements.push({ tag: node.tag, line: node.loc.start.line });
        }
      }

      visitChildren(node.children ?? [], result);
    }

    previous = node;
  }
}

/**
 * @template T
 * @param {Record<string, T>} record
 * @returns {Record<string, T>}
 */
function sortKeys(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/**
 * Per-file, per-tag counts with zero counts and files without native elements omitted.
 *
 * @param {Record<string, NativeElement[]>} elementsByFile
 * @returns {Counts}
 */
export function countNativeElements(elementsByFile) {
  /** @type {Counts} */
  const counts = {};

  for (const [relativePath, elements] of Object.entries(elementsByFile)) {
    /** @type {Record<string, number>} */
    const perTag = {};
    for (const { tag } of elements) {
      perTag[tag] = (perTag[tag] ?? 0) + 1;
    }
    if (Object.keys(perTag).length > 0) {
      counts[relativePath] = sortKeys(perTag);
    }
  }

  return sortKeys(counts);
}

/**
 * @param {unknown} value
 * @returns {Counts}
 */
export function validateBaseline(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${baselineRelativePath} must be a JSON object of { "<path>": { "<tag>": count } }.`);
  }

  for (const [relativePath, perTag] of Object.entries(value)) {
    if (!perTag || typeof perTag !== 'object' || Array.isArray(perTag)) {
      throw new Error(`${baselineRelativePath}: "${relativePath}" must map tag names to counts.`);
    }
    for (const [tag, count] of Object.entries(perTag)) {
      if (!nativeTagSet.has(tag)) {
        throw new Error(`${baselineRelativePath}: "${relativePath}" lists unknown tag "${tag}" (allowed: ${nativeTags.join(', ')}).`);
      }
      if (!Number.isInteger(count) || count < 1) {
        throw new Error(`${baselineRelativePath}: "${relativePath}" <${tag}> must be a positive integer; drop zero entries.`);
      }
    }
  }

  return /** @type {Counts} */ (value);
}

/**
 * @typedef {{ path: string, tag: string, allowed: number, actual: number }} CountDelta
 */

/**
 * @param {Counts} counts
 * @param {Counts} baseline
 * @returns {{ growth: CountDelta[], stale: CountDelta[] }}
 */
export function compareToBaseline(counts, baseline) {
  /** @type {CountDelta[]} */
  const growth = [];
  /** @type {CountDelta[]} */
  const stale = [];
  const paths = [...new Set([...Object.keys(counts), ...Object.keys(baseline)])].sort();

  for (const relativePath of paths) {
    const actualTags = counts[relativePath] ?? {};
    const allowedTags = baseline[relativePath] ?? {};

    for (const tag of nativeTags) {
      const actual = actualTags[tag] ?? 0;
      const allowed = allowedTags[tag] ?? 0;
      if (actual > allowed) {
        growth.push({ path: relativePath, tag, allowed, actual });
      } else if (actual < allowed) {
        stale.push({ path: relativePath, tag, allowed, actual });
      }
    }
  }

  return { growth, stale };
}

/**
 * Returns the baseline `--update` would write. Counts may only go down (including files that were
 * deleted or no longer use native elements); any increase or new file is refused.
 *
 * @param {Counts} counts
 * @param {Counts} baseline
 * @returns {{ ok: true, baseline: Counts } | { ok: false, increases: CountDelta[] }}
 */
export function computeUpdatedBaseline(counts, baseline) {
  const { growth } = compareToBaseline(counts, baseline);
  if (growth.length > 0) {
    return { ok: false, increases: growth };
  }
  return { ok: true, baseline: normalizeCounts(counts) };
}

/**
 * Drops zero counts and empty files and sorts paths and tags, so serialized baselines are stable.
 *
 * @param {Counts} counts
 * @returns {Counts}
 */
export function normalizeCounts(counts) {
  /** @type {Counts} */
  const normalized = {};
  for (const [relativePath, perTag] of Object.entries(counts)) {
    const nonZero = Object.fromEntries(Object.entries(perTag).filter(([, count]) => count > 0));
    if (Object.keys(nonZero).length > 0) {
      normalized[relativePath] = sortKeys(nonZero);
    }
  }
  return sortKeys(normalized);
}

/**
 * @param {Counts} counts
 */
export function summarizeCounts(counts) {
  /** @type {Record<string, number>} */
  const perTag = Object.fromEntries(nativeTags.map((tag) => [tag, 0]));
  for (const tags of Object.values(counts)) {
    for (const [tag, count] of Object.entries(tags)) {
      perTag[tag] = (perTag[tag] ?? 0) + count;
    }
  }
  return { files: Object.keys(counts).length, perTag };
}

/**
 * @param {Counts} counts
 */
export function formatTotals(counts) {
  const { files, perTag } = summarizeCounts(counts);
  return `${files} file(s): ${nativeTags.map((tag) => `${perTag[tag]} <${tag}>`).join(', ')}`;
}

/**
 * @param {Counts} baseline
 */
export function serializeBaseline(baseline) {
  return `${JSON.stringify(normalizeCounts(baseline), null, 2)}\n`;
}

/**
 * Full check over already-scanned files. Pure, so the spec can drive it with in-memory fixtures.
 *
 * @param {Record<string, FileScan>} scans keyed by repo-relative path
 * @param {Counts} baseline
 */
export function checkUiConventions(scans, baseline) {
  const elementsByFile = Object.fromEntries(Object.entries(scans).map(([p, scan]) => [p, scan.elements]));
  const counts = countNativeElements(elementsByFile);
  const { growth, stale } = compareToBaseline(counts, baseline);

  /** @type {string[]} */
  const errors = [];
  for (const [relativePath, scan] of Object.entries(scans)) {
    for (const error of scan.errors) {
      errors.push(`${relativePath}:${error.line} ${error.message}`);
    }
  }

  /** @type {string[]} */
  const growthLines = [];
  for (const delta of growth) {
    const where = delta.allowed === 0 && !baseline[delta.path] ? 'file is not in the baseline' : `baseline allows ${delta.allowed}`;
    growthLines.push(`${delta.path}: ${delta.actual} native <${delta.tag}> (${where})`);
    for (const element of elementsByFile[delta.path] ?? []) {
      if (element.tag === delta.tag) {
        growthLines.push(`  - ${delta.path}:${element.line} <${element.tag}>`);
      }
    }
  }

  const staleLines = stale.map(
    (delta) =>
      `${delta.path}: baseline allows ${delta.allowed} <${delta.tag}>, found ${delta.actual}${delta.actual === 0 && !counts[delta.path] ? ' (file has no native elements or no longer exists)' : ''}`,
  );

  const exceptions = Object.entries(scans).flatMap(([p, scan]) => scan.exceptions.map((exception) => ({ path: p, ...exception })));

  return {
    ok: errors.length === 0 && growthLines.length === 0 && staleLines.length === 0,
    counts,
    errors,
    growth: growthLines,
    stale: staleLines,
    exceptions,
  };
}

function listVueFiles() {
  const output = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '*.vue'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const files = [...new Set(output.split('\0').filter(Boolean))];
  return files.filter((file) => isScannedVueFile(file) && existsSync(path.join(rootDir, file))).sort();
}

async function scanRepository() {
  /** @type {Record<string, FileScan>} */
  const scans = {};
  for (const relativePath of listVueFiles()) {
    scans[relativePath] = findNativeElements(relativePath, await readFile(path.join(rootDir, relativePath), 'utf8'));
  }
  return scans;
}

async function readBaseline() {
  const baselinePath = path.join(rootDir, baselineRelativePath);
  if (!existsSync(baselinePath)) {
    return undefined;
  }
  return validateBaseline(JSON.parse(await readFile(baselinePath, 'utf8')));
}

/**
 * @param {string[]} lines
 */
function printList(lines) {
  for (const line of lines) {
    console.error(line.startsWith('  ') ? line : `- ${line}`);
  }
}

async function main() {
  const mode = process.argv.includes('--init') ? 'init' : process.argv.includes('--update') ? 'update' : 'check';
  const baselinePath = path.join(rootDir, baselineRelativePath);
  const scans = await scanRepository();
  const baseline = await readBaseline();
  const result = checkUiConventions(scans, baseline ?? {});

  if (result.errors.length > 0) {
    console.error('UI conventions failed: a ui-native exception has no reason, or a template could not be parsed.');
    console.error('Where to look next: give every `<!-- ui-native: -->` exception a reason and fix template parse errors.');
    printList(result.errors);
    process.exit(1);
  }

  if (mode === 'init') {
    if (baseline) {
      console.error(
        `UI conventions: ${baselineRelativePath} already exists. Use \`${updateCommand}\` to lower counts; it never raises them.`,
      );
      process.exit(1);
    }
    await writeFile(baselinePath, serializeBaseline(result.counts));
    console.log(`UI conventions: created ${baselineRelativePath} with ${formatTotals(result.counts)}.`);
    return;
  }

  if (!baseline) {
    console.error(
      `UI conventions failed: ${baselineRelativePath} is missing. Restore it from git; \`--init\` only bootstraps a new repository.`,
    );
    process.exit(1);
  }

  if (mode === 'update') {
    const updated = computeUpdatedBaseline(result.counts, baseline);
    if (!updated.ok) {
      console.error('UI conventions: refusing to update the baseline because native element counts would go up.');
      console.error(
        'Why it matters: the baseline is a ratchet; it only tightens. Replace the new native elements with components/ui primitives,',
      );
      console.error('or mark a justified one with `<!-- ui-native: <reason> -->` on the line above it.');
      printList(result.growth);
      process.exit(1);
    }
    const before = formatTotals(baseline);
    await writeFile(baselinePath, serializeBaseline(updated.baseline));
    console.log(`UI conventions: baseline updated (${before} -> ${formatTotals(updated.baseline)}).`);
    return;
  }

  if (result.growth.length > 0) {
    console.error(
      'UI conventions failed: new native <button>/<input>/<label>/<textarea>/<table>/<select> elements outside app/components/ui/.',
    );
    console.error(
      'Why it matters: the shadcn migration (epic #631) ratchets native elements down; new ones bypass the design system (accessibility, theming, focus handling).',
    );
    console.error(
      'Where to look next: use the components/ui primitive (UiButton, UiInput, UiLabel, UiTextarea, UiTable, UiSelect), or put `<!-- ui-native: <reason> -->` on the line above an element that must stay native.',
    );
    console.error(`Baseline: ${baselineRelativePath}. Never raise it by hand.`);
    printList(result.growth);
  }

  if (result.stale.length > 0) {
    console.error(
      `UI conventions failed: ${baselineRelativePath} is stale; native elements were removed but the baseline was not lowered.`,
    );
    console.error(`Where to look next: run \`${updateCommand}\` and commit the lowered baseline in the same commit as the migration.`);
    printList(result.stale);
  }

  if (!result.ok) {
    process.exit(1);
  }

  console.log(
    `UI conventions OK: scanned ${Object.keys(scans).length} .vue file(s) outside ${primitivesPrefix}; native elements match the baseline (${formatTotals(result.counts)}); ${result.exceptions.length} accepted ui-native exception(s).`,
  );
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
