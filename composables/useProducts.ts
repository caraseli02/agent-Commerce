import { useRuntimeConfig } from '#app';
import { fetchFeaturedProducts, fetchProductTab, fetchSearchProduct } from '~/composables/api/products';
import { loadFeaturedProducts } from '~/composables/loadFeaturedProducts';
import { loadProductDetail, productDetailCacheKey } from '~/composables/loadProductDetail';
import { loadSearchResults, searchResultsCacheKey, type SearchResultsQuery } from '~/composables/loadSearchResults';
import type { ProductDetail, ProductInterface, ProductParametricDataFeaturesInterface, SearchData } from '~/types/product';

export function useProducts() {
  const config = useRuntimeConfig();

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

    if (!data?.items || !Array.isArray(data.items.items)) {
      return null;
    }

    return {
      items: data.items.items,
      searchData: data,
    };
  };

  const loadProductTabProducts = async (tabPath: string): Promise<ProductInterface[]> => {
    const response = await fetchProductTab(tabPath);
    const data = response?.data || response;

    return Array.isArray(data) ? (data as ProductInterface[]) : [];
  };

  const loadFeaturedProductsList = async (): Promise<ProductInterface[]> => {
    return loadFeaturedProducts({
      mockMode: Boolean(config.public.MOCK_MODE),
      fetchMock: () => fetchFeaturedProducts(),
      fetchLive: () => fetchFeaturedProducts(),
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
    loadProductTabProducts,
    loadFeaturedProductsList,
    loadSimilarProductsByFeatures,
    loadProductBySlug,
    loadSearchPageResults,
    productDetailCacheKey,
    searchResultsCacheKey,
  };
}
