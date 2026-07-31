import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { loadSearchResults, searchResultsCacheKey } from '~/composables/loadSearchResults';
import type { SearchData } from '~/model/products/response/ProductSearchResponse';

const searchPagePath = resolve('pages/search.vue');

const baseQuery = {
  keyword: 'capacitor',
  category: 'audio',
  page: 1,
  perPage: 10,
  sortBy: 'manufacturerCode',
  sortOrder: 'asc' as const,
  additionalFilters: { inStock: true },
  featureFilters: [],
};

describe('search useAsyncData contract', () => {
  it('loads search results through useAsyncData with stable cache keys and error UI', () => {
    const searchPage = readFileSync(searchPagePath, 'utf8');

    expect(searchPage).toContain('searchResultsCacheKey(searchQuery.value)');
    expect(searchPage).toContain('loadSearchResults(searchQuery.value)');
    expect(searchPage).toContain('v-if="pending"');
    expect(searchPage).toContain('v-else-if="error"');
    expect(searchPage).toContain('role="alert"');
    expect(searchPage).not.toContain('onMounted(');
    expect(searchPage).not.toContain('async function getProduct');
  });

  it('builds deterministic cache keys from search query values', () => {
    expect(searchResultsCacheKey(baseQuery)).toBe('search-results::capacitor::audio::1::10::manufacturerCode::asc::{"inStock":true}::[]');
    expect(searchResultsCacheKey({ ...baseQuery, keyword: ' resistor ' })).toBe(
      searchResultsCacheKey({ ...baseQuery, keyword: 'resistor' })
    );
  });

  it('returns search data from a successful response', async () => {
    const searchData = {
      filtersCount: 0,
      items: { total_items: 1, page_count: 1, page: 1, items: [] },
      filters: {},
    } as unknown as SearchData;
    const fetchSearch = vi.fn().mockResolvedValue({ status: 'success', data: searchData });

    await expect(loadSearchResults(baseQuery, fetchSearch)).resolves.toEqual(searchData);
    expect(fetchSearch).toHaveBeenCalledWith(
      'capacitor',
      'audio',
      1,
      10,
      { sortBy: 'manufacturerCode', sortOrder: 'asc' },
      { inStock: true },
      []
    );
  });

  it('throws when the API returns no search data', async () => {
    const fetchSearch = vi.fn().mockResolvedValue({ status: 'success', data: null });

    await expect(loadSearchResults(baseQuery, fetchSearch)).rejects.toThrow('Search results unavailable');
  });
});
