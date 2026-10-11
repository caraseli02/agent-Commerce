import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const CATALOG_PAGE_REVALIDATE_SECONDS = 30;

// Candidate-only: nuxt.config.ts deliberately does not install these rules
// until protected-preview isolation/revalidation evidence is available.
export const catalogIsrCandidateRules = {
  '/search': { isr: { expiration: CATALOG_PAGE_REVALIDATE_SECONDS, allowQuery: ['__isr_route'], passQuery: true } },
  '/search/_payload.json': { isr: { expiration: CATALOG_PAGE_REVALIDATE_SECONDS, allowQuery: ['__isr_route'], passQuery: true } },
  '/product/*': { isr: { expiration: CATALOG_PAGE_REVALIDATE_SECONDS, allowQuery: ['__isr_route'], passQuery: true } },
  '/product/*/_payload.json': { isr: { expiration: CATALOG_PAGE_REVALIDATE_SECONDS, allowQuery: ['__isr_route'], passQuery: true } },
  '/product/categories': { isr: false },
  '/product/categories/_payload.json': { isr: false },
};

const EXPECTED_ALIASES = ['search-isr', 'search/_payload.json-isr', 'product/[-]-isr', 'product/[-]/_payload.json-isr'];
const PUBLIC_SOURCES: Record<string, string> = {
  'search-isr': '^/search/?$',
  'search/_payload.json-isr': '^/search/_payload\\.json/?$',
  'product/[-]-isr': '^/product/[^/]+/?$',
  'product/[-]/_payload.json-isr': '^/product/[^/]+/_payload\\.json/?$',
};
interface VercelRoute {
  src?: string;
  dest?: string;
  handle?: string;
  middlewarePath?: string;
  continue?: boolean;
  caseSensitive?: boolean;
  methods?: string[];
}

async function prerenderFiles(directory: string, prefix = ''): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory() && !entry.name.endsWith('.func'))
      paths.push(...(await prerenderFiles(join(directory, entry.name), relative + '/')));
    else if (entry.name.endsWith('.prerender-config.json')) paths.push(relative.slice(0, -'.prerender-config.json'.length));
  }
  return paths;
}

/** Validate all prerender assets before installing a global pre-filesystem gate. */
export async function protectCatalogIsrOutput(outputDir: string, policySource: string) {
  const configPath = join(outputDir, 'config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8')) as { version: number; routes: VercelRoute[] };
  if (config.version !== 3 || !Array.isArray(config.routes)) throw new Error('Expected Vercel Build Output API v3 routes');
  if (config.routes.some((route) => route.middlewarePath))
    throw new Error('Reassess existing middleware before installing catalog ISR gate');
  const functionsDir = join(outputDir, 'functions');
  const aliases = (await prerenderFiles(functionsDir)).sort();
  if (JSON.stringify(aliases) !== JSON.stringify([...EXPECTED_ALIASES].sort()))
    throw new Error('Catalog ISR requires exactly the four approved prerender assets');
  for (const alias of aliases) {
    const metadata = JSON.parse(await readFile(join(functionsDir, alias + '.prerender-config.json'), 'utf8'));
    if (
      metadata.expiration !== CATALOG_PAGE_REVALIDATE_SECONDS ||
      metadata.passQuery !== true ||
      JSON.stringify(metadata.allowQuery) !== JSON.stringify(['__isr_route']) ||
      Object.keys(metadata).some((key) => !['expiration', 'passQuery', 'allowQuery'].includes(key))
    ) {
      throw new Error('Unexpected catalog ISR expiration/query/error metadata: ' + alias);
    }
    if (config.routes.filter((route) => route.dest === '/' + alias + '?__isr_route=$__isr_route').length !== 1)
      throw new Error('Expected one catalog ISR destination: ' + alias);
  }
  const dynamicCategory = config.routes.findIndex(
    (route) => route.src === '(?<__isr_route>/product/categories)' && route.dest === '/__fallback',
  );
  const publicProduct = config.routes.findIndex((route) => route.dest === '/product/[-]-isr?__isr_route=$__isr_route');
  if (dynamicCategory < 0 || dynamicCategory > publicProduct) throw new Error('Private product/categories must precede public product ISR');
  if (!config.routes.some((route) => route.src === '(?<__isr_route>/product/categories/_payload.json)' && route.dest === '/__fallback'))
    throw new Error('Missing private category payload override');
  if (
    config.routes.some(
      (route) => route.dest?.includes('-isr') && !aliases.some((alias) => route.dest === '/' + alias + '?__isr_route=$__isr_route'),
    )
  )
    throw new Error('Unapproved ISR destination');
  if (!config.routes.some((route) => route.handle === 'filesystem')) throw new Error('Expected Vercel filesystem routing phase');
  for (const alias of aliases) {
    const route = config.routes.find((route) => route.dest === '/' + alias + '?__isr_route=$__isr_route')!;
    // Nitro's static source does not escape the dot in _payload.json. Tighten
    // it so a lookalike URL cannot skip classification and enter the cache.
    route.src = '^(?<__isr_route>' + PUBLIC_SOURCES[alias].slice(1, -1) + ')$';
    route.caseSensitive = true;
    route.methods = ['GET', 'HEAD'];
  }
  // Global placement also rejects direct aliases and externally supplied Nitro
  // routing metadata before the filesystem can reach any prerender asset.
  config.routes.unshift({ src: '^/.*$', middlewarePath: 'catalog-gate', continue: true });
  const middlewareDir = join(functionsDir, 'catalog-gate.func');
  const source = await readFile(policySource, 'utf8');
  await mkdir(middlewareDir, { recursive: true });
  await writeFile(join(middlewareDir, 'index.mjs'), source);
  await writeFile(join(middlewareDir, '.vc-config.json'), JSON.stringify({ runtime: 'edge', entrypoint: 'index.mjs' }));
  await writeFile(configPath, JSON.stringify(config, null, 2));
}
