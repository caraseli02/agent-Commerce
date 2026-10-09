import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, toValue } from 'vue';

import { PRIVATE_ROBOTS, PRIVATE_ROUTE_PREFIXES, isPrivateRoute, withPrivateRobotsHeaders } from '~/helpers/seo-routes';

type HeadInput = Record<string, unknown>;

const seoMetaCalls: HeadInput[] = [];
const headCalls: HeadInput[] = [];
const route = { path: '/' };
let publicConfig: Record<string, unknown> = {};

const resolve = (value: unknown): unknown => (typeof value === 'function' ? (value as () => unknown)() : toValue(value));

/** Resolves every reactive value the composable handed to useSeoMeta, dropping absent tags like unhead does. */
const emittedMeta = (): Record<string, unknown> => {
  const merged = Object.assign({}, ...seoMetaCalls) as HeadInput;
  return Object.fromEntries(
    Object.entries(merged)
      .map(([key, value]) => [key, resolve(value)])
      .filter(([, value]) => value !== undefined && value !== ''),
  );
};

const emittedHead = () => {
  const merged = Object.assign({}, ...headCalls) as HeadInput;
  return {
    link: (resolve(merged.link) as HeadInput[] | undefined)?.map((link) => ({ ...link, href: resolve(link.href) })),
    script: resolve(merged.script) as HeadInput[] | undefined,
  };
};

const loadComposable = async () => import('../composables/usePageSeo');

describe('usePageSeo', () => {
  beforeEach(() => {
    vi.resetModules();
    seoMetaCalls.length = 0;
    headCalls.length = 0;
    route.path = '/';
    publicConfig = {};

    vi.stubGlobal('useSeoMeta', (input: HeadInput) => seoMetaCalls.push(input));
    vi.stubGlobal('useHead', (input: HeadInput) => headCalls.push(input));
    vi.stubGlobal('useRoute', () => route);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: publicConfig }));
    vi.stubGlobal('useRequestURL', () => new URL('http://request.test:3201/some/path?x=1'));
  });

  it('emits title, description, Open Graph and Twitter tags for a public storefront page', async () => {
    route.path = '/search';
    const { usePageSeo } = await loadComposable();

    usePageSeo({ title: 'Search', description: 'Find parts fast.' });

    expect(emittedMeta()).toEqual({
      title: 'Search',
      description: 'Find parts fast.',
      robots: 'index,follow',
      ogType: 'website',
      ogSiteName: 'Components Marketplace',
      ogTitle: 'Search | Components Marketplace',
      ogDescription: 'Find parts fast.',
      ogUrl: 'http://request.test:3201/search',
      twitterCard: 'summary',
      twitterTitle: 'Search | Components Marketplace',
      twitterDescription: 'Find parts fast.',
    });
    expect(emittedHead().link).toEqual([{ rel: 'canonical', href: 'http://request.test:3201/search' }]);
  });

  it('falls back to the site description when a page supplies none', async () => {
    const { usePageSeo } = await loadComposable();

    usePageSeo({ title: 'Home' });

    const meta = emittedMeta();
    expect(meta.description).toMatch(/electronic components/i);
    expect(meta.ogDescription).toBe(meta.description);
    expect(meta.twitterDescription).toBe(meta.description);
  });

  it('prefers the configured public site URL and makes images absolute with a large Twitter card', async () => {
    publicConfig = { siteUrl: 'https://shop.example.com/' };
    route.path = '/product/stm32f407vgt6';
    const { usePageSeo } = await loadComposable();

    usePageSeo({ title: 'STM32F407VGT6', image: '/images/stm32.png', type: 'product' });

    const meta = emittedMeta();
    expect(meta.ogType).toBe('product');
    expect(meta.ogUrl).toBe('https://shop.example.com/product/stm32f407vgt6');
    expect(meta.ogImage).toBe('https://shop.example.com/images/stm32.png');
    expect(meta.twitterImage).toBe('https://shop.example.com/images/stm32.png');
    expect(meta.twitterCard).toBe('summary_large_image');
  });

  it('keeps absolute and protocol-relative images and tracks reactive inputs', async () => {
    const { usePageSeo } = await loadComposable();
    const title = ref('Loading');
    const image = ref('');

    usePageSeo({ title, image });
    expect(emittedMeta().twitterCard).toBe('summary');
    expect(emittedMeta().ogImage).toBeUndefined();

    title.value = 'LM317';
    image.value = '//cdn.example.com/lm317.jpg';
    expect(emittedMeta()).toMatchObject({
      title: 'LM317',
      ogTitle: 'LM317 | Components Marketplace',
      ogImage: 'https://cdn.example.com/lm317.jpg',
      twitterCard: 'summary_large_image',
    });

    image.value = 'https://img.example.com/a.png';
    expect(emittedMeta().ogImage).toBe('https://img.example.com/a.png');
  });

  it('emits only title and robots when a page opts out of indexing', async () => {
    const { usePageSeo } = await loadComposable();

    usePageSeo({ title: 'Account', description: 'Ignored', robots: 'noindex,nofollow' });

    expect(emittedMeta()).toEqual({ title: 'Account', robots: 'noindex,nofollow' });
    expect(emittedHead().link).toBeUndefined();
  });

  it('serializes JSON-LD into a single keyed ld+json script and omits it when empty', async () => {
    const { usePageSeo } = await loadComposable();
    const product = ref<Record<string, unknown> | null>(null);

    usePageSeo({ title: 'LM317', jsonLd: () => (product.value ? [product.value] : undefined) });
    expect(emittedHead().script).toEqual([]);

    product.value = { '@context': 'https://schema.org', '@type': 'Product', name: 'LM317' };
    expect(emittedHead().script).toEqual([
      {
        key: 'page-seo-json-ld',
        type: 'application/ld+json',
        textContent: '[{"@context":"https://schema.org","@type":"Product","name":"LM317"}]',
      },
    ]);
  });
});

describe('private route robots policy', () => {
  beforeEach(() => {
    vi.resetModules();
    seoMetaCalls.length = 0;
    vi.stubGlobal('useSeoMeta', (input: HeadInput) => seoMetaCalls.push(input));
    vi.stubGlobal('useRoute', () => route);
  });

  it('marks private routes noindex,nofollow and leaves public routes to their page', async () => {
    const { usePrivateRouteSeo } = await loadComposable();
    route.path = '/';
    usePrivateRouteSeo();

    expect(emittedMeta()).toEqual({});

    for (const path of ['/login', '/checkout/success', '/dashboard/orders/7', '/product/categories', '/cart/']) {
      route.path = path;
      expect(emittedMeta(), path).toEqual({ robots: 'noindex,nofollow' });
    }

    route.path = '/product/stm32f407vgt6';
    expect(emittedMeta()).toEqual({});
  });

  it('matches whole path segments of the canonical private prefix list', () => {
    expect(PRIVATE_ROUTE_PREFIXES).toEqual([
      '/dashboard',
      '/checkout',
      '/cart',
      '/order-summary',
      '/order-tracking',
      '/login',
      '/signup',
      '/forgot-password',
      '/password-reset',
      '/verify-email',
      '/product/categories',
    ]);
    expect(isPrivateRoute('/order-summary/abc')).toBe(true);
    expect(isPrivateRoute('/checkout')).toBe(true);
    expect(isPrivateRoute('/cartography')).toBe(false);
    expect(isPrivateRoute('/search')).toBe(false);
    expect(isPrivateRoute('/')).toBe(false);
  });

  it('adds an X-Robots-Tag header rule for each private prefix without losing existing route rules', () => {
    const rules = withPrivateRobotsHeaders({
      '/dashboard/**': { appMiddleware: ['auth'], ssr: false },
      '/api/**': { cors: true },
    });

    expect(rules['/dashboard/**']).toEqual({
      appMiddleware: ['auth'],
      ssr: false,
      headers: { 'X-Robots-Tag': PRIVATE_ROBOTS },
    });
    expect(rules['/api/**']).toEqual({ cors: true });
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expect(rules[prefix]?.headers).toEqual({ 'X-Robots-Tag': 'noindex,nofollow' });
      expect(rules[`${prefix}/**`]?.headers).toEqual({ 'X-Robots-Tag': 'noindex,nofollow' });
    }
  });
});
