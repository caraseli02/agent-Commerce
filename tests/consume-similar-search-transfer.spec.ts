import { describe, expect, it } from 'vitest';

import { consumeSimilarSearchTransfer } from '~/composables/consumeSimilarSearchTransfer';
import type { ProductParametricDataFeaturesInterface, SearchData } from '~~/types/product';

const transferredProducts = {
  filtersCount: 0,
  filters: {},
  items: { total_items: 1, page_count: 1, page: 1, items: [] },
} as unknown as SearchData;

const transferredFeatures = [
  { FeatureName: 'Capacitance', FeatureValue: '100uF', checked: true },
] as ProductParametricDataFeaturesInterface[];

describe('consumeSimilarSearchTransfer', () => {
  it('does not apply a prior similar-product transfer to a later normal search', () => {
    expect(consumeSimilarSearchTransfer(true, transferredProducts, transferredFeatures)).toEqual(transferredFeatures);

    expect(consumeSimilarSearchTransfer(false, transferredProducts, transferredFeatures)).toEqual([]);
  });
});
