#!/usr/bin/env node
import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const OUTPUT_DIR = path.join(ROOT, '.output/public/_nuxt');
const PRECOMPUTED_PATHS = [
  path.join(ROOT, '.output/server/chunks/virtual/precomputed.mjs'), // Nuxt 4
  path.join(ROOT, '.output/server/chunks/build/client.precomputed.mjs'), // Nuxt 3
];

const DEFAULT_CHUNK_LIMIT_BYTES = 500 * 1024;
const MARKER_CHUNK_LIMITS = {
  apexcharts: 550 * 1024,
  'vue3-apexcharts': 550 * 1024,
  leaflet: 350 * 1024,
};

const DASHBOARD_ONLY_MARKERS = Object.keys(MARKER_CHUNK_LIMITS);
const DASHBOARD_ENTRY_LIMITS = {
  'components/dashboard/World.vue': 350 * 1024,
};

const STOREFRONT_ROUTE_KEYS = [
  'pages/index.vue',
  'pages/search.vue',
  'pages/cart.vue',
  'pages/order-summary/index.vue',
  'pages/checkout/index.vue',
];
const STOREFRONT_ROUTE_GZIP_LIMIT_BYTES = 360 * 1024;

function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function normalizeChunkName(importRef) {
  return importRef.replace(/^_/, '');
}

function getChunkLimit(markers) {
  if (markers.length === 0) {
    return DEFAULT_CHUNK_LIMIT_BYTES;
  }

  return Math.max(...markers.map((marker) => MARKER_CHUNK_LIMITS[marker]));
}

async function getPrecomputedPath() {
  for (const candidate of PRECOMPUTED_PATHS) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the other Nuxt output layout.
    }
  }

  throw new Error(`Unable to find Nuxt route manifest. Checked: ${PRECOMPUTED_PATHS.join(', ')}`);
}

async function listJavaScriptChunks() {
  const entries = await readdir(OUTPUT_DIR);
  return entries.filter((entry) => entry.endsWith('.js'));
}

async function classifyChunks(chunkFiles) {
  const classified = new Map();

  for (const fileName of chunkFiles) {
    const filePath = path.join(OUTPUT_DIR, fileName);
    const [fileStat, contents] = await Promise.all([stat(filePath), readFile(filePath, 'utf8')]);
    const markers = DASHBOARD_ONLY_MARKERS.filter((marker) => contents.includes(marker));

    classified.set(fileName, {
      fileName,
      size: fileStat.size,
      markers,
      limit: getChunkLimit(markers),
    });
  }

  return classified;
}

function extractImports(contents) {
  const imports = new Set();
  const importPattern = /from"\.\/([^"]+\.js)"/g;

  for (const match of contents.matchAll(importPattern)) {
    imports.add(match[1]);
  }

  return imports;
}

async function buildImportGraph(chunkFiles) {
  const graph = new Map();

  for (const fileName of chunkFiles) {
    const contents = await readFile(path.join(OUTPUT_DIR, fileName), 'utf8');
    graph.set(fileName, extractImports(contents));
  }

  return graph;
}

function collectReachableChunks(entryFiles, graph) {
  const visited = new Set();
  const queue = [...entryFiles];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const dependency of graph.get(current) ?? []) {
      if (!visited.has(dependency)) {
        queue.push(dependency);
      }
    }
  }

  return visited;
}

function extractRouteEntryFiles(precomputedSource, routeKey) {
  const escapedRouteKey = routeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const preloadPattern = new RegExp(`"${escapedRouteKey}":\\{resourceType:"script"[^}]*file:"([^"]+)"`);
  const preloadMatch = precomputedSource.match(preloadPattern);

  if (preloadMatch?.[1]) {
    return [preloadMatch[1]];
  }

  const routePattern = new RegExp(`"${escapedRouteKey}":\\{scripts:\\{[^}]*\\},styles:[^,]*,preload:\\{[^}]*file:"([^"]+)"`);
  const routeMatch = precomputedSource.match(routePattern);

  return routeMatch?.[1] ? [routeMatch[1]] : [];
}

function extractRouteStaticImports(precomputedSource, routeKey) {
  const escapedRouteKey = routeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importsPattern = new RegExp(`"${escapedRouteKey}":\\{resourceType:"script"[^}]*imports:\\[([^\\]]+)\\]`);
  const importsMatch = precomputedSource.match(importsPattern);

  if (!importsMatch?.[1]) {
    return [];
  }

  return [...importsMatch[1].matchAll(/"([^"]+\.js)"/g)].map((match) => normalizeChunkName(match[1]));
}

function extractDynamicEntryFile(precomputedSource, sourceKey) {
  const escapedSourceKey = sourceKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entryPattern = new RegExp(`"${escapedSourceKey}":\\{[^}]*file:"([^"]+)"`);
  const entryMatch = precomputedSource.match(entryPattern);

  return entryMatch?.[1] ?? null;
}

function applyManifestDashboardMarkers(classifiedChunks, precomputedSource) {
  const missingEntries = [];

  for (const [sourceKey, limit] of Object.entries(DASHBOARD_ENTRY_LIMITS)) {
    const entryFile = extractDynamicEntryFile(precomputedSource, sourceKey);

    if (!entryFile || !classifiedChunks.has(entryFile)) {
      missingEntries.push(sourceKey);
      continue;
    }

    const chunk = classifiedChunks.get(entryFile);
    chunk.markers.push(sourceKey);
    chunk.limit = Math.max(chunk.limit, limit);
  }

  return missingEntries;
}

async function checkChunkSizes(classifiedChunks) {
  const violations = [];

  for (const chunk of classifiedChunks.values()) {
    if (chunk.size > chunk.limit) {
      const markerLabel = chunk.markers.length > 0 ? ` (${chunk.markers.join(', ')})` : '';
      violations.push(`${chunk.fileName} is ${formatKilobytes(chunk.size)} (limit ${formatKilobytes(chunk.limit)}${markerLabel})`);
    }
  }

  return violations;
}

async function checkStorefrontIsolation(classifiedChunks, graph, precomputedSource) {
  const dashboardOnlyChunks = [...classifiedChunks.values()].filter((chunk) => chunk.markers.length > 0).map((chunk) => chunk.fileName);

  const violations = [];

  for (const routeKey of STOREFRONT_ROUTE_KEYS) {
    const entryFiles = extractRouteEntryFiles(precomputedSource, routeKey);
    const staticImports = extractRouteStaticImports(precomputedSource, routeKey);

    if (entryFiles.length === 0 && staticImports.length === 0) {
      continue;
    }

    const reachable = collectReachableChunks([...entryFiles, ...staticImports], graph);
    const leakedChunks = dashboardOnlyChunks.filter((chunk) => reachable.has(chunk));

    if (leakedChunks.length > 0) {
      violations.push(`${routeKey} reaches dashboard-only chunks: ${leakedChunks.join(', ')}`);
    }
  }

  return violations;
}

async function checkStorefrontRouteBudgets(graph, precomputedSource) {
  const violations = [];

  for (const routeKey of STOREFRONT_ROUTE_KEYS) {
    const entryFiles = extractRouteEntryFiles(precomputedSource, routeKey);
    const reachable = collectReachableChunks(entryFiles, graph);
    const chunks = await Promise.all([...reachable].map((fileName) => readFile(path.join(OUTPUT_DIR, fileName))));
    const gzipBytes = chunks.reduce((total, contents) => total + gzipSync(contents, { level: 9 }).length, 0);

    if (gzipBytes > STOREFRONT_ROUTE_GZIP_LIMIT_BYTES) {
      violations.push(
        `${routeKey} reaches ${formatKilobytes(gzipBytes)} gzip (limit ${formatKilobytes(STOREFRONT_ROUTE_GZIP_LIMIT_BYTES)})`,
      );
    }
  }

  return violations;
}

async function main() {
  const chunkFiles = await listJavaScriptChunks();
  const classifiedChunks = await classifyChunks(chunkFiles);
  const graph = await buildImportGraph(chunkFiles);
  const precomputedSource = await readFile(await getPrecomputedPath(), 'utf8');
  const missingDashboardEntries = applyManifestDashboardMarkers(classifiedChunks, precomputedSource);

  const sizeViolations = await checkChunkSizes(classifiedChunks);
  const isolationViolations = await checkStorefrontIsolation(classifiedChunks, graph, precomputedSource);
  const budgetViolations = await checkStorefrontRouteBudgets(graph, precomputedSource);
  const violations = [...sizeViolations, ...isolationViolations, ...budgetViolations];

  const dashboardChunks = [...classifiedChunks.values()].filter((chunk) => chunk.markers.length > 0);
  console.log(
    `Bundle size check: scanned ${chunkFiles.length} client chunk(s); dashboard-only markers found in ${dashboardChunks.length} chunk(s).`,
  );

  for (const chunk of dashboardChunks) {
    console.log(`- ${chunk.fileName}: ${formatKilobytes(chunk.size)} (${chunk.markers.join(', ')})`);
  }

  if (missingDashboardEntries.length > 0) {
    console.error(`Bundle size check failed: dashboard entries missing from client manifest: ${missingDashboardEntries.join(', ')}`);
    process.exit(1);
  }

  if (violations.length > 0) {
    console.error('Bundle size check failed:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    'Bundle size check passed: dashboard chart/map chunks stay isolated and within configured limits; storefront route gzip budgets passed.',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
