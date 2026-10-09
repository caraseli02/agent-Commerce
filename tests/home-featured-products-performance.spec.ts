import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { loadFeaturedProducts } from '~/composables/loadFeaturedProducts';

const featuredProductsPath = resolve('app/components/home/FeaturedProducts.vue');
const productBlocksPath = resolve('app/components/global/ProductBlocks.vue');
const productTabsPath = resolve('app/components/global/ProductTabs.vue');
const customerCreditPath = resolve('app/components/dashboard/control-panel/settings-view/CustomerCredit.vue');

describe('home featured-products performance', () => {
  it('loads the initial catalog during SSR and preserves tabs for client-side filtering', () => {
    const featuredProducts = readFileSync(featuredProductsPath, 'utf8');
    const productBlocks = readFileSync(productBlocksPath, 'utf8');
    const productTabs = readFileSync(productTabsPath, 'utf8');

    expect(featuredProducts).toContain("useAsyncData('home-featured-products'");
    expect(featuredProducts).toContain(':fetched-products="productList ?? []"');
    expect(featuredProducts).toContain('useProducts');
    expect(featuredProducts).toContain('loadFeaturedProductsList');
    expect(featuredProducts).not.toContain('onMounted(');
    expect(productBlocks).toContain(':initial-products="fetchedProducts"');
    expect(productBlocks).toContain('v-if="filters?.length"');
    expect(productTabs).toContain('const activeFilter = ref(initialFilter)');
    expect(productTabs).toContain('loadProductTabProducts');
    expect(productTabs).toContain('{ immediate: true }');
    expect(productTabs).not.toContain('onMounted(');
  });

  it('uses the request-bound mock endpoint without calling the live API', async () => {
    const product = { name: 'Mock product' };
    const fetchMock = vi.fn().mockResolvedValue({ data: [product] });
    const fetchLive = vi.fn();

    await expect(loadFeaturedProducts({ mockMode: true, fetchMock, fetchLive })).resolves.toEqual([product]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchLive).not.toHaveBeenCalled();
  });

  it('uses the live API outside mock mode and accepts an unwrapped product array', async () => {
    const product = { name: 'Live product' };
    const fetchMock = vi.fn();
    const fetchLive = vi.fn().mockResolvedValue([product]);

    await expect(loadFeaturedProducts({ mockMode: false, fetchMock, fetchLive })).resolves.toEqual([product]);
    expect(fetchLive).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an empty list for malformed and rejected responses', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      loadFeaturedProducts({
        mockMode: true,
        fetchMock: vi.fn().mockResolvedValue({ data: null }),
        fetchLive: vi.fn(),
      }),
    ).resolves.toEqual([]);
    await expect(
      loadFeaturedProducts({
        mockMode: false,
        fetchMock: vi.fn(),
        fetchLive: vi.fn().mockRejectedValue(new Error('network unavailable')),
      }),
    ).resolves.toEqual([]);

    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('uses the compressed local chart texture', () => {
    const customerCredit = readFileSync(customerCreditPath, 'utf8');

    expect(customerCredit).toContain('/customer-credit-chart-bg.webp');
    expect(customerCredit).not.toContain('/customer-credit-chart-bg.png');
  });
});
