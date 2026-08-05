import { useNuxtApp, useRuntimeConfig } from '#app';
import type { SearchSimilarProductRequest } from '~/model/products/request/SearchSimilarProductRequest';
import type { NewProductResponse } from '~/model/products/response/NewProductResponse';
import type { ProductDetailResponse, ProductParametricDataFeaturesInterface, ProductResponse } from '~/types/product';
import type { ProductSearchResponse } from '~/model/products/response/ProductSearchResponse';
import type { SearchSimilarProductResponse } from '~/model/products/response/SearchSimilarProductResponse';

const RESOURCE = '/products';

export async function fetchSingleProduct(id: string): Promise<ProductDetailResponse> {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ProductDetailResponse>(`${RESOURCE}/${id}`, {
    method: 'GET',
  });
}

export async function fetchProductTab(path: string): Promise<ProductResponse> {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ProductResponse>(`${RESOURCE}/${path}`, {
    method: 'GET',
  });
}

export async function fetchFeaturedProducts(): Promise<ProductResponse> {
  const config = useRuntimeConfig();

  if (config.public.MOCK_MODE) {
    const requestFetch = useRequestFetch();
    return await requestFetch<ProductResponse>(`/api${RESOURCE}/featured`);
  }

  return await fetchProductTab('featured');
}

export async function fetchNewProducts(): Promise<NewProductResponse> {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<NewProductResponse>(`${RESOURCE}/new-products`, {
    method: 'GET',
  });
}

export async function fetchSearchProduct(
  keyword: string,
  category: string | null,
  page = 1,
  perPage = 10,
  sort: Record<string, unknown> = {},
  additionalfilters: Record<string, unknown> = {},
  featuresFilters: ProductParametricDataFeaturesInterface[] = []
): Promise<ProductSearchResponse> {
  const { $apiClient } = useNuxtApp();
  let filters: Record<string, unknown> = {};

  if (!keyword || keyword === '') {
    filters = { page, perPage, ...sort };
  } else {
    keyword = keyword.trim();

    filters = {
      page,
      perPage,
      ...sort,
      operator: '$or',
      code: keyword,
      description: keyword,
      alias: keyword,
      name: keyword,
      manufacturer: keyword,
      manufacturerCode: keyword,
    };
  }

  if (category) {
    filters = { ...filters, category };
  }

  if (additionalfilters) {
    filters = { ...filters, ...additionalfilters };
  }

  return await $apiClient<ProductSearchResponse>(`${RESOURCE}/search`, {
    method: 'POST',
    body: {
      filters: featuresFilters,
    },
    params: filters,
  });
}

export async function fetchProductByCriteria(payload: SearchSimilarProductRequest): Promise<SearchSimilarProductResponse> {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<SearchSimilarProductResponse>(`${RESOURCE}/filters/search`, {
    method: 'POST',
    body: payload,
  });
}
