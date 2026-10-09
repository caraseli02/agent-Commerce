import { afterEach, describe, expect, it, vi } from 'vitest';
import type { $Fetch } from 'ofetch';

vi.mock('#app', () => ({
  defineNuxtPlugin: (setup: (nuxtApp: unknown) => unknown) => setup,
}));
vi.mock('~/store/authStore', () => ({ useAuthStore: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client SSR setup', () => {
  it('captures the reactive token during plugin setup and uses Nitro internal fetch afterward', async () => {
    let hasNuxtContext = true;
    const tokenCookie = { value: 'first-token' };
    const useCookieMock = vi.fn((name: string) => {
      if (!hasNuxtContext) {
        throw new Error('useCookie called without Nuxt context');
      }
      expect(name).toBe('token');
      return tokenCookie;
    });
    vi.stubGlobal('useCookie', useCookieMock);

    const eventFetch = vi.fn(
      async (_request: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const { default: apiPlugin } = await import('../plugins/api');
    const pluginSetup = apiPlugin as unknown as (nuxtApp: unknown) => { provide: { apiClient: $Fetch } };
    const result = pluginSetup({
      $config: { public: { MOCK_MODE: true, BASE_URL_API: 'https://unused.example' } },
      ssrContext: { event: { fetch: eventFetch } },
    });

    expect(useCookieMock).toHaveBeenCalledTimes(1);
    hasNuxtContext = false;

    const apiClient = result.provide.apiClient;
    await expect(apiClient<{ ok: boolean }>('/products')).resolves.toEqual({ ok: true });
    tokenCookie.value = 'updated-token';
    await expect(apiClient<{ ok: boolean }>('/products')).resolves.toEqual({ ok: true });

    expect(useCookieMock).toHaveBeenCalledTimes(1);
    expect(eventFetch).toHaveBeenCalledTimes(2);
    for (const [index, [request, init]] of eventFetch.mock.calls.entries()) {
      expect(new URL(String(request), 'http://nitro.local').pathname).toBe('/api/products');
      expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${index === 0 ? 'first-token' : 'updated-token'}`);
    }
  });
});
