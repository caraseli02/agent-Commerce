import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { createEvent, getResponseHeader, setResponseHeader } from 'h3';
import type { H3Event } from 'h3';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

let finalize: (event: H3Event) => void;
beforeAll(async () => {
  vi.stubGlobal('defineNitroPlugin', (setup: (app: unknown) => void) => setup);
  const { default: setup } = await import('~~/server/plugins/catalog-page-cache');
  setup({
    hooks: {
      hook: (_name: string, callback: typeof finalize) => {
        finalize = callback;
      },
    },
  } as Parameters<typeof setup>[0]);
});
afterAll(() => vi.unstubAllGlobals());

function event() {
  const request = new IncomingMessage(new Socket());
  request.url = '/search';
  const response = new ServerResponse(request);
  const result = createEvent(request, response);
  result.context.catalogPageCacheCandidate = true;
  setResponseHeader(result, 'X-Catalog-Page-Generated-At', '123');
  return result;
}

describe('final catalog response cache boundary', () => {
  it('caches only a completed healthy anonymous render', () => {
    const request = event();
    request.context.catalogPageCacheHealthy = true;
    finalize(request);
    expect(getResponseHeader(request, 'vercel-cdn-cache-control')).toBe('public, s-maxage=30');
    expect(getResponseHeader(request, 'x-catalog-page-generated-at')).toBe('123');
  });
  it.each(['pre-plugin failure', 'error status', 'late Set-Cookie'])('keeps %s out of shared caches', (scenario) => {
    const request = event();
    request.context.catalogPageCacheHealthy = scenario !== 'pre-plugin failure';
    if (scenario === 'error status') request.node.res.statusCode = 503;
    if (scenario === 'late Set-Cookie') setResponseHeader(request, 'Set-Cookie', 'test=private');
    finalize(request);
    expect(getResponseHeader(request, 'cache-control')).toBe('private, no-store');
    expect(getResponseHeader(request, 'cdn-cache-control')).toBe('no-store');
    expect(getResponseHeader(request, 'vercel-cdn-cache-control')).toBe('no-store');
    expect(getResponseHeader(request, 'x-catalog-page-generated-at')).toBeUndefined();
  });
});
