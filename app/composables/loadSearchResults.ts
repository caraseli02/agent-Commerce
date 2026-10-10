import { fetchSearchProduct } from '~/composables/api/products';
import type { ProductParametricDataFeaturesInterface, SearchData } from '~~/types/product';

export type SearchResultsQuery = {
  keyword: string;
  category: string | null;
  page: number;
  perPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  additionalFilters?: Record<string, unknown>;
  featureFilters?: ProductParametricDataFeaturesInterface[];
};

export type SearchResultsLoader = (query: SearchResultsQuery) => Promise<SearchData>;

function stableSerialize(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function searchResultsCacheKey(query: SearchResultsQuery): string {
  const { keyword, category, page, perPage, sortBy, sortOrder, additionalFilters = {}, featureFilters = [] } = query;

  return [
    'search-results',
    keyword.trim(),
    category ?? '',
    page,
    perPage,
    sortBy,
    sortOrder,
    stableSerialize(additionalFilters),
    stableSerialize(featureFilters),
  ].join('::');
}

export async function loadSearchResults(
  query: SearchResultsQuery,
  fetchSearch: typeof fetchSearchProduct = fetchSearchProduct,
): Promise<SearchData> {
  const { keyword, category, page, perPage, sortBy, sortOrder, additionalFilters = {}, featureFilters = [] } = query;
  // Keep request keyword aligned with searchResultsCacheKey (which uses keyword.trim()).
  const normalizedKeyword = keyword.trim();

  const response = await fetchSearch(normalizedKeyword, category, page, perPage, { sortBy, sortOrder }, additionalFilters, featureFilters);

  if (!response?.data) {
    throw new Error('Search results unavailable');
  }

  return response.data;
}
