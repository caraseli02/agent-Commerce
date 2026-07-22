import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const featuredProductsPath = resolve('components/home/FeaturedProducts.vue');
const productBlocksPath = resolve('components/global/ProductBlocks.vue');
const productTabsPath = resolve('components/global/ProductTabs.vue');
const customerCreditPath = resolve('components/dashboard/control-panel/settings-view/CustomerCredit.vue');

describe('home featured-products performance', () => {
  it('loads the initial catalog during SSR and preserves tabs for client-side filtering', () => {
    const featuredProducts = readFileSync(featuredProductsPath, 'utf8');
    const productBlocks = readFileSync(productBlocksPath, 'utf8');
    const productTabs = readFileSync(productTabsPath, 'utf8');

    expect(featuredProducts).toContain("useAsyncData('home-featured-products'");
    expect(featuredProducts).toContain(':fetched-products="productList ?? []"');
    expect(featuredProducts).not.toContain('onMounted(');
    expect(productBlocks).toContain(':initial-products="fetchedProducts"');
    expect(productBlocks).toContain('v-if="filters?.length"');
    expect(productTabs).toContain('const activeFilter = ref(initialFilter)');
    expect(productTabs).toContain('{ immediate: true }');
    expect(productTabs).not.toContain('onMounted(');
  });

  it('uses the request-bound mock endpoint while retaining the live API fallback', () => {
    const featuredProducts = readFileSync(featuredProductsPath, 'utf8');

    expect(featuredProducts).toContain('const requestFetch = useRequestFetch();');
    expect(featuredProducts).toMatch(
      /config\.public\.MOCK_MODE\s*\? await requestFetch<ProductResponse>\('\/api\/products\/featured'\)\s*:\s*await fetchProductTab\('featured'\)/
    );
    expect(featuredProducts).toContain('return Array.isArray(data) ? (data as ProductInterface[]) : [];');
    expect(featuredProducts).toContain('return [];');
  });

  it('uses the compressed local chart texture', () => {
    const customerCredit = readFileSync(customerCreditPath, 'utf8');

    expect(customerCredit).toContain('/customer-credit-chart-bg.webp');
    expect(customerCredit).not.toContain('/customer-credit-chart-bg.png');
  });
});
