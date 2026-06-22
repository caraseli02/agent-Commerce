import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { mockProducts } from '~/server/utils/mockProducts';

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
      query.keyword || query.code || query.description || query.alias || query.name || query.manufacturer || query.manufacturerCode || ''
    );
  const keyword = String(keywordSource || '')
    .trim()
    .toLowerCase();

  if (keyword) {
    filteredProducts = (mockProducts as ProductInterface[]).filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword) ||
        p.manufacturer?.toLowerCase().includes(keyword) ||
        p.code?.toLowerCase().includes(keyword)
    );
  }

  const category = String(body.category || query.category || '')
    .trim()
    .toLowerCase();
  if (category) {
    filteredProducts = filteredProducts.filter((p) => p.category?.toLowerCase() === category);
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
