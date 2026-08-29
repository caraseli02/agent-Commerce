import type { ProductInterface } from '~/types/product';
import { mockProducts } from '~/server/utils/mockProducts';
import { getProductTaxonomyPath, matchesCategoryPath } from '~/helpers/categoryPath.helper';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const body = (await readBody(event)) as {
    keyword?: string;
    category?: string;
    page?: number;
    perPage?: number;
  };

  let filteredProducts = mockProducts as ProductInterface[];

  const keywordSource =
    body.keyword ||
    String(
      query.keyword ||
        query.q ||
        query.code ||
        query.description ||
        query.alias ||
        query.name ||
        query.manufacturer ||
        query.manufacturerCode ||
        '',
    );
  const keyword = String(keywordSource || '')
    .trim()
    .toLowerCase();

  const matchesKeyword = (p: ProductInterface, term: string) => {
    if (!term) return true;

    const featureText = (p.details?.ParametricData?.Features || [])
      .map((feature) => `${feature.FeatureName || ''} ${feature.FeatureValue || ''}`)
      .join(' ')
      .toLowerCase();

    return (
      p.name.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.manufacturer?.toLowerCase().includes(term) ||
      p.code?.toLowerCase().includes(term) ||
      p.alias?.toLowerCase().includes(term) ||
      p.manufacturerCode?.toLowerCase().includes(term) ||
      p.path?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      featureText.includes(term)
    );
  };

  if (keyword) {
    filteredProducts = (mockProducts as ProductInterface[]).filter((p) => matchesKeyword(p, keyword));
  }

  const category = String(body.category || query.category || '').trim();
  if (category) {
    // Slug paths are the contract: `semiconductors`, `semiconductors/microcontrollers`, or a deeper taxonomy leaf.
    // Legacy display names like `Audio` still work because normalizeCategoryPath slugifies them first.
    // Do not fall back to keyword substring matching — that would treat `?category=usb` as a free-text search.
    filteredProducts = filteredProducts.filter((p) =>
      matchesCategoryPath(
        {
          path: p.path,
          category: p.category,
          alias: p.alias,
          taxonomyPath: getProductTaxonomyPath(p),
        },
        category,
      ),
    );
  }

  const sortBy = String(query.sortBy || '').trim();
  const sortOrder = String(query.sortOrder || 'asc').toLowerCase();
  if (sortBy) {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      const first = (a as unknown as Record<string, unknown>)[sortBy];
      const second = (b as unknown as Record<string, unknown>)[sortBy];

      if (first === second) return 0;

      if (typeof first === 'number' && typeof second === 'number') {
        return sortOrder === 'desc' ? second - first : first - second;
      }

      return sortOrder === 'desc'
        ? String(second ?? '').localeCompare(String(first ?? ''))
        : String(first ?? '').localeCompare(String(second ?? ''));
    });
  }

  const page = Number(query.page || body.page || 1);
  const perPage = Number(query.perPage || body.perPage || 10);
  const start = (page - 1) * perPage;
  const items = filteredProducts.slice(start, start + perPage);
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / perPage));

  return {
    status: 'success',
    data: {
      filtersCount: 0,
      filters: {},
      items: {
        total_items: filteredProducts.length,
        page_count: pageCount,
        page,
        items,
      },
    },
  };
});
