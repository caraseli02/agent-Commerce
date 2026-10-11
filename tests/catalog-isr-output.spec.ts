import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNitro } from 'nitropack';
import { catalogIsrCandidateRules, protectCatalogIsrOutput } from '../helpers/catalog-isr-output';

const folders: string[] = [];
const policy = fileURLToPath(new URL('../server/catalog-isr-policy.mjs', import.meta.url));
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function candidate() {
  const folder = await mkdtemp(join(tmpdir(), 'catalog-isr-'));
  folders.push(folder);
  const output = join(folder, '.vercel/output');
  const nitro = await createNitro({
    rootDir: folder,
    preset: 'vercel',
    compatibilityDate: '2024-11-20',
    routeRules: catalogIsrCandidateRules,
    output: { dir: output, serverDir: join(output, 'functions/__fallback.func') },
  });
  try {
    // Use the installed preset generator, not hand-copied route fixtures.
    const preset = await import('../node_modules/nitropack/dist/presets/vercel/utils.mjs');
    await mkdir(nitro.options.output.serverDir, { recursive: true });
    await preset.generateFunctionFiles(nitro);
  } finally {
    await nitro.close();
  }
  return output;
}

describe('catalog ISR candidate Build Output', () => {
  it('protects installed Nitro output before filesystem and all cache destinations', async () => {
    const output = await candidate();
    await protectCatalogIsrOutput(output, policy);
    const config = JSON.parse(await readFile(join(output, 'config.json'), 'utf8'));
    expect(config.routes[0]).toEqual({ src: '^/.*$', middlewarePath: 'catalog-gate', continue: true });
    const privateCategory = config.routes.find((route: { src?: string }) => route.src === '^/product/categories/?$');
    expect(privateCategory.dest).toBe('/__fallback');
    expect(new RegExp(privateCategory.src).test('/product/categories/')).toBe(true);
    expect(config.routes.findIndex((route: { handle?: string }) => route.handle === 'filesystem')).toBeGreaterThan(0);
    const payload = config.routes.find((route: { dest?: string }) => route.dest?.startsWith('/search/_payload.json-isr?'));
    expect(payload.caseSensitive).toBe(true);
    expect(payload.methods).toEqual(['GET', 'HEAD']);
    expect(new RegExp(payload.src).test('/search/_payload.json')).toBe(true);
    expect(new RegExp(payload.src).test('/search/_payloadXjson')).toBe(false);
    expect(new RegExp(payload.src).test('/account/search/_payload.json')).toBe(false);
    expect(await readFile(join(output, 'functions/catalog-gate.func/index.mjs'), 'utf8')).toBe(await readFile(policy, 'utf8'));
    expect(JSON.parse(await readFile(join(output, 'functions/catalog-gate.func/.vc-config.json'), 'utf8'))).toEqual({
      runtime: 'edge',
      entrypoint: 'index.mjs',
    });
  });

  it('canonicalizes Nuxt merged copies of the same approved query key', async () => {
    const output = await candidate();
    const path = join(output, 'functions/search/_payload.json-isr.prerender-config.json');
    const metadata = JSON.parse(await readFile(path, 'utf8'));
    await writeFile(path, JSON.stringify({ ...metadata, allowQuery: ['__isr_route', '__isr_route'] }));
    await protectCatalogIsrOutput(output, policy);
    expect(JSON.parse(await readFile(path, 'utf8')).allowQuery).toEqual(['__isr_route']);
  });

  it.each([
    ['unbounded query variants', { allowQuery: undefined }],
    ['missing query transport', { passQuery: false }],
    ['unbounded expiration', { expiration: false }],
    ['cached errors', { exposeErrBody: true }],
    ['static fallback bypassing runtime', { fallback: 'identity.html' }],
  ])('rejects %s before modifying routes', async (_label, patch) => {
    const output = await candidate();
    const path = join(output, 'functions/search-isr.prerender-config.json');
    const original = await readFile(join(output, 'config.json'), 'utf8');
    await writeFile(path, JSON.stringify({ ...JSON.parse(await readFile(path, 'utf8')), ...patch }));
    await expect(protectCatalogIsrOutput(output, policy)).rejects.toThrow('metadata');
    expect(await readFile(join(output, 'config.json'), 'utf8')).toBe(original);
  });

  it('rejects private or unknown prerender assets', async () => {
    const output = await candidate();
    await writeFile(join(output, 'functions/checkout-isr.prerender-config.json'), '{}');
    await expect(protectCatalogIsrOutput(output, policy)).rejects.toThrow('four approved');
  });

  it('rejects missing dynamic category override and duplicate gate installation', async () => {
    const output = await candidate();
    const path = join(output, 'config.json');
    const config = JSON.parse(await readFile(path, 'utf8'));
    await writeFile(
      path,
      JSON.stringify({
        ...config,
        routes: config.routes.filter((route: { src?: string }) => route.src !== '(?<__isr_route>/product/categories)'),
      }),
    );
    await expect(protectCatalogIsrOutput(output, policy)).rejects.toThrow('categories');
    await writeFile(path, JSON.stringify(config));
    await protectCatalogIsrOutput(output, policy);
    await expect(protectCatalogIsrOutput(output, policy)).rejects.toThrow('existing middleware');
  });

  it('selects only mock Vercel Preview builds, never production or ordinary local builds', async () => {
    const { isCatalogIsrPreview } = await import('../helpers/catalog-isr-preview.mjs');
    expect(isCatalogIsrPreview({ VERCEL_ENV: 'preview', NITRO_PRESET: 'vercel', NUXT_PUBLIC_MOCK_MODE: 'true' })).toBe(true);
    for (const env of [
      { VERCEL_ENV: 'production', VERCEL: '1', NUXT_PUBLIC_MOCK_MODE: 'true' },
      { VERCEL_ENV: 'preview', VERCEL: '1', NUXT_PUBLIC_MOCK_MODE: 'false' },
      { NITRO_PRESET: 'vercel', NUXT_PUBLIC_MOCK_MODE: 'true' },
    ])
      expect(isCatalogIsrPreview(env)).toBe(false);
  });
});
