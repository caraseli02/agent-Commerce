import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(path), 'utf8');

const buyerPathBrowseSearchSurfaces = [
  'app/components/layout/header/Search.vue',
  'app/components/layout/header/MainRow.vue',
  'app/pages/search.vue',
  'app/pages/product/[slug].vue',
  'app/components/home/FeaturedProducts.vue',
  'app/components/global/ProductTabs.vue',
  'app/components/global/NewProducts.vue',
  'app/components/product/Table.vue',
];

describe('browse and search application seam', () => {
  it('keeps buyer-path browse/search surfaces off direct products API imports', () => {
    const offenders = buyerPathBrowseSearchSurfaces.filter((path) => /from ['"]~{1,2}\/composables\/api\/products['"]/.test(source(path)));

    expect(offenders).toEqual([]);
  });

  it('routes browse/search orchestration through useProducts', () => {
    const useProductsSource = source('app/composables/useProducts.ts');
    const productsApiSource = source('app/composables/api/products.ts');

    expect(useProductsSource).toContain("from '~/composables/api/products'");
    expect(useProductsSource).toContain('loadSearchResults');
    expect(useProductsSource).toContain('loadProductDetail');
    expect(useProductsSource).toContain('loadFeaturedProducts');
    expect(useProductsSource).toContain('fetchFeaturedProducts');
    expect(useProductsSource).not.toContain('useRequestFetch');
    expect(useProductsSource).not.toContain('searchHeaderProducts');
    expect(productsApiSource).toContain('fetchFeaturedProducts');
  });

  it('treats empty search result arrays as successful header search responses', () => {
    const useProductsSource = source('app/composables/useProducts.ts');

    expect(useProductsSource).toContain('!Array.isArray(data.items.items)');
    expect(useProductsSource).not.toContain('data?.items?.items?.length');
  });
});
