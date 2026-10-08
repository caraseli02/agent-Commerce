import { createHash } from 'node:crypto';
import { defineEventHandler, getRequestHeader, getRequestURL, getRouterParams, setResponseHeader, type H3Event } from 'h3';
import { defineCachedFunction } from 'nitropack/runtime/internal/cache';
import { useRuntimeConfig } from 'nitropack/runtime/internal/config';

export const CATALOG_FRESH_SECONDS = 30;
export const CATALOG_STALE_SECONDS = 60;

// Resolvers receive only these representation inputs, never identity or event
// context. Adding an input requires adding it here, so it also enters the key.
interface CatalogInput {
  params: Record<string, string>;
  method: string;
  mockMode: boolean;
}

export function isAnonymousCatalogRead(event: H3Event, mockMode: boolean): boolean {
  const url = getRequestURL(event);
  return (
    mockMode &&
    (event.method === 'GET' || event.method === 'HEAD') &&
    getRequestHeader(event, 'authorization') === undefined &&
    getRequestHeader(event, 'cookie') === undefined &&
    url.search === '' &&
    /^\/api\/(?:categories|products\/(?!search\/?$)[^/]+)\/?$/.test(url.pathname)
  );
}

export function defineAnonymousCatalogHandler<T>(
  name: string,
  resolve: (input: CatalogInput) => T | Promise<T>,
  normalizeParams: (params: Record<string, string>) => Record<string, string> = (params) => params,
) {
  const cached = defineCachedFunction(
    async (_event: H3Event, input: CatalogInput) => ({ body: await resolve(input), generatedAt: Date.now() }),
    {
      name,
      group: 'anonymous-catalog-v1',
      maxAge: CATALOG_FRESH_SECONDS,
      staleMaxAge: CATALOG_STALE_SECONDS,
      swr: true,
      getKey: (_event, input) => createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      // Nitro 2's SWR storage does not itself enforce staleMaxAge. An invalid
      // entry blocks on refresh, including after repeated refresh failures.
      validate: (entry) =>
        entry.value?.body !== undefined &&
        Number.isFinite(entry.value.generatedAt) &&
        entry.value.generatedAt <= Date.now() &&
        Date.now() - entry.value.generatedAt <= (CATALOG_FRESH_SECONDS + CATALOG_STALE_SECONDS) * 1000,
    },
  );

  return defineEventHandler(async (event) => {
    const mockMode = useRuntimeConfig(event).public.MOCK_MODE === true;
    // Normalize only equivalent representation inputs (e.g. existing
    // case-insensitive IDs/tabs), keeping the fixture key space finite.
    const input: CatalogInput = {
      params: normalizeParams(getRouterParams(event)),
      method: event.method,
      mockMode,
    };
    // Bypass before Nitro storage lookup: private requests neither consume nor
    // populate anonymous entries. Browser/CDN storage is disabled by middleware.
    if (!isAnonymousCatalogRead(event, mockMode)) return resolve(input);
    const result = await cached(event, input);
    setResponseHeader(event, 'X-Catalog-Generated-At', String(result.generatedAt));
    return result.body;
  });
}
