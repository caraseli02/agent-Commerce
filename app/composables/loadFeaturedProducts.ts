import type { ProductInterface } from '~~/types/product';

type FeaturedProductsLoader = () => Promise<unknown>;

interface FeaturedProductsDependencies {
  mockMode: boolean;
  fetchMock: FeaturedProductsLoader;
  fetchLive: FeaturedProductsLoader;
}

export async function loadFeaturedProducts({ mockMode, fetchMock, fetchLive }: FeaturedProductsDependencies): Promise<ProductInterface[]> {
  try {
    const response = await (mockMode ? fetchMock() : fetchLive());
    const data = response && typeof response === 'object' && 'data' in response ? response.data : response;

    return Array.isArray(data) ? (data as ProductInterface[]) : [];
  } catch (error) {
    console.error('Failed to load featured products', error);
    return [];
  }
}
