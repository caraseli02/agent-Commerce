import type { ProductParametricDataFeaturesInterface, SearchData } from '~/types/product';

export const consumeSimilarSearchTransfer = (
  isSimilarSearch: boolean,
  similarProducts: SearchData | null,
  similarProductFeatures: ProductParametricDataFeaturesInterface[] | null,
) => {
  if (!isSimilarSearch || !similarProducts || !similarProductFeatures) {
    return [];
  }

  return similarProductFeatures;
};
