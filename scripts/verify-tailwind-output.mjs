#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const cssRoot = path.join(process.cwd(), '.output/public/_nuxt');
const forbiddenDirectives = /@(apply|reference)\b/;
const requiredGlobalUtilities = [/\.flex\{display:flex\}/, /\.bg-blue-500\{background-color:var\(--color-blue-500\)\}/];

function hasTopLevelComma(value) {
  let depth = 0;
  for (const character of value) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) return true;
  }
  return false;
}

async function cssAssets(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const assets = await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return cssAssets(file);
      return entry.isFile() && entry.name.endsWith('.css') && !entry.name.endsWith('.map') ? [file] : [];
    }),
  );
  return assets.flat();
}

const assets = await cssAssets(cssRoot).catch(() => []);
if (assets.length === 0) {
  console.error('Tailwind output guard failed: Nuxt emitted no production CSS assets under .output/public/_nuxt.');
  process.exit(1);
}

const css = (await Promise.all(assets.map((asset) => readFile(asset, 'utf8')))).join('\n');
if (forbiddenDirectives.test(css)) {
  console.error(
    'Tailwind output guard failed: emitted production CSS still contains @apply or @reference. Check the Vite Tailwind pipeline and SFC references.',
  );
  process.exit(1);
}

const missingUtilities = requiredGlobalUtilities.filter((utility) => !utility.test(css));
if (missingUtilities.length > 0) {
  console.error(
    'Tailwind output guard failed: the global Tailwind entry did not emit representative utilities (.flex and .bg-blue-500). Check nuxt.config.ts css[].',
  );
  process.exit(1);
}

const invalidGridValues = [...css.matchAll(/grid-template-(?:columns|rows):([^;}]+)/g)].map((match) => match[1]).filter(hasTopLevelComma);
if (invalidGridValues.length > 0) {
  console.error(
    'Tailwind output guard failed: emitted grid template values contain top-level commas. Use underscores for spaces in Tailwind v4 arbitrary grid values.',
  );
  process.exit(1);
}

console.log(
  `Tailwind output guard passed (${assets.length} CSS assets; no raw directives; global utilities and valid grid templates emitted).`,
);
