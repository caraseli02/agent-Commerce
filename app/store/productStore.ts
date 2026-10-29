import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ProductParametricDataFeaturesInterface, SearchData } from '~~/types/product';

export const useProductStore = defineStore('product-store', () => {
  const similarProductFeatures = ref<ProductParametricDataFeaturesInterface[] | null>(null);
  const similarProducts = ref<SearchData | null>(null);
  const showSimilarOnly = ref(false);
  // Latest header-search keyword. A new object per search, so /search reacts even when the keyword repeats.
  const headerSearch = ref<{ keyword: string } | null>(null);

  const setHeaderSearch = (keyword: string) => {
    headerSearch.value = { keyword };
  };

  const setSimilarProductFeatures = (features: ProductParametricDataFeaturesInterface[]) => {
    similarProductFeatures.value = features;
  };

  const setSimilarProducts = (products: SearchData) => {
    similarProducts.value = products;
  };

  const getSimilarProductFeatures = computed(() => similarProductFeatures.value as ProductParametricDataFeaturesInterface[]);
  const getSimilarProducts = computed(() => similarProducts.value as SearchData);

  return {
    similarProductFeatures,
    similarProducts,
    setSimilarProductFeatures,
    setSimilarProducts,
    getSimilarProductFeatures,
    getSimilarProducts,
    showSimilarOnly,
    headerSearch,
    setHeaderSearch,
  };
});
