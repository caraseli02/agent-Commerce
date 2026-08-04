import { useRuntimeConfig } from '#app';
import { fetchProductTab, fetchSearchProduct } from '~/composables/api/products';
import { loadFeaturedProducts } from '~/composables/loadFeaturedProducts';
import { loadProductDetail, productDetailCacheKey } from '~/composables/loadProductDetail';
import { loadSearchResults, searchResultsCacheKey, type SearchResultsQuery } from '~/composables/loadSearchResults';
import type { ProductInterface, ProductParametricDataFeaturesInterface, ProductResponse } from '~/model/products/response/ProductResponse';
import type { SearchData } from '~/model/products/response/ProductSearchResponse';
import type { ProductDetail } from '~/types/product';

export function useProducts() {
  const config = useRuntimeConfig();
  const requestFetch = useRequestFetch();

  const searchProducts = async (
    keyword: string,
    category: string | null,
    page = 1,
    perPage = 10,
    sort: Record<string, unknown> = {},
    additionalfilters: Record<string, unknown> = {},
    featuresFilters: ProductParametricDataFeaturesInterface[] = []
  ) => {
    return await fetchSearchProduct(keyword, category, page, perPage, sort, additionalfilters, featuresFilters);
  };

  const searchHeaderResults = async (
    keyword: string,
    category: string | null,
    page = 1,
    perPage = 10
  ): Promise<{ items: ProductInterface[]; searchData: SearchData } | null> => {
    const response = await searchProducts(keyword, category, page, perPage);
    const data = response.data;

    if (!data?.items?.items?.length) {
      return null;
    }

    return {
      items: data.items.items,
      searchData: data,
    };
  };

  const searchHeaderProducts = async (
    keyword: string,
    category: string | null,
    page = 1,
    perPage = 10
  ): Promise<ProductInterface[] | null> => {
    const result = await searchHeaderResults(keyword, category, page, perPage);
    return result?.items ?? null;
  };

  const loadProductTabProducts = async (tabPath: string): Promise<ProductInterface[]> => {
    const response = await fetchProductTab(tabPath);
    const data = response?.data || response;

    return Array.isArray(data) ? (data as ProductInterface[]) : [];
  };

  const loadFeaturedProductsList = async (): Promise<ProductInterface[]> => {
    return loadFeaturedProducts({
      mockMode: Boolean(config.public.MOCK_MODE),
      fetchMock: () => requestFetch<ProductResponse>('/api/products/featured'),
      fetchLive: () => fetchProductTab('featured'),
    });
  };

  const loadSimilarProductsByFeatures = async (
    features: ProductParametricDataFeaturesInterface[],
    page = 1,
    perPage = 10
  ): Promise<SearchData | undefined> => {
    const response = await searchProducts('', null, page, perPage, {}, {}, features);
    return response.data;
  };

  const loadProductBySlug = async (slug: string): Promise<ProductDetail> => loadProductDetail(slug);

  const loadSearchPageResults = async (query: SearchResultsQuery): Promise<SearchData> => loadSearchResults(query);

  return {
    searchProducts,
    searchHeaderResults,
    searchHeaderProducts,
    loadProductTabProducts,
    loadFeaturedProductsList,
    loadSimilarProductsByFeatures,
    loadProductBySlug,
    loadSearchPageResults,
    productDetailCacheKey,
    searchResultsCacheKey,
  };
}
