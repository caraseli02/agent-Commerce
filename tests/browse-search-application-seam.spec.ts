import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(path), 'utf8');

const buyerPathBrowseSearchSurfaces = [
  'components/layout/header/Search.vue',
  'components/layout/header/MainRow.vue',
  'pages/search.vue',
  'pages/product/[slug].vue',
  'components/home/FeaturedProducts.vue',
  'components/global/ProductTabs.vue',
  'components/global/NewProducts.vue',
  'components/product/Table.vue',
];

describe('browse and search application seam', () => {
  it('keeps buyer-path browse/search surfaces off direct products API imports', () => {
    const offenders = buyerPathBrowseSearchSurfaces.filter((path) => /from ['"]~{1,2}\/composables\/api\/products['"]/.test(source(path)));

    expect(offenders).toEqual([]);
  });

  it('routes browse/search orchestration through useProducts', () => {
    const useProductsSource = source('composables/useProducts.ts');

    expect(useProductsSource).toContain("from '~/composables/api/products'");
    expect(useProductsSource).toContain('loadSearchResults');
    expect(useProductsSource).toContain('loadProductDetail');
    expect(useProductsSource).toContain('loadFeaturedProducts');
  });
});
