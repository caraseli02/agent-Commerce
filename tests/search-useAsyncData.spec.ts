import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { loadSearchResults, searchResultsCacheKey } from '~/composables/loadSearchResults';
import type { SearchData } from '~/types/product';

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
    expect(searchPage).toContain('motion-reduce:animate-none');
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
  });

  it('trims keyword before fetching so cache key and request stay aligned', async () => {
    const searchData = {
      filtersCount: 0,
      items: { total_items: 1, page_count: 1, page: 1, items: [] },
      filters: {},
    } as unknown as SearchData;

    // Observable contract: only the trimmed keyword resolves successfully.
    const fetchSearch = vi.fn(async (keyword: string) => {
      if (keyword === 'resistor') {
        return { status: 'success', data: searchData };
      }
      return { status: 'success', data: null };
    }) as unknown as typeof import('~/composables/api/products').fetchSearchProduct;

    await expect(loadSearchResults({ ...baseQuery, keyword: ' resistor ' }, fetchSearch)).resolves.toEqual(searchData);
    await expect(loadSearchResults({ ...baseQuery, keyword: ' resistor ' }, fetchSearch)).resolves.toEqual(
      await loadSearchResults({ ...baseQuery, keyword: 'resistor' }, fetchSearch)
    );
  });

  it('throws when the API returns no search data', async () => {
    const fetchSearch = vi.fn().mockResolvedValue({ status: 'success', data: null });

    await expect(loadSearchResults(baseQuery, fetchSearch)).rejects.toThrow('Search results unavailable');
  });
});
