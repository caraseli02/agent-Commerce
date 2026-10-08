import { readFile } from 'node:fs/promises';

export async function loadNitroCacheRuntime(entries: Map<string, unknown>, captureError: (error: unknown) => void) {
  // Execute installed Nitro's cache implementation, adapting only its virtual
  // app/storage imports which are unavailable outside a built Nitro runtime.
  const cacheUrl = import.meta.resolve('nitropack/runtime/internal/cache');
  let source = await readFile(new URL(cacheUrl), 'utf8');
  Object.assign(globalThis, {
    __catalogCacheTest: {
      storage: {
        getItem: async (key: string) => structuredClone(entries.get(key)),
        setItem: async (key: string, value: unknown) => {
          entries.set(key, structuredClone(value));
        },
      },
      app: { captureError },
    },
  });
  source = source
    .replace('import { useNitroApp } from "./app.mjs";', 'const useNitroApp = () => globalThis.__catalogCacheTest.app;')
    .replace('import { useStorage } from "./storage.mjs";', 'const useStorage = () => globalThis.__catalogCacheTest.storage;')
    .replace('"./hash.mjs"', JSON.stringify(new URL('./hash.mjs', cacheUrl).href))
    .replace('"h3"', JSON.stringify(import.meta.resolve('h3')))
    .replace('"ufo"', JSON.stringify(import.meta.resolve('ufo')));
  return (await import(
    /* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )) as typeof import('nitropack/runtime/internal/cache');
}
