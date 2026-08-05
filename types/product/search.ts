import type { ProductInterface } from './response';

export interface ProductSearchResponse {
  status: string;
  data: SearchData;
}

export interface SearchData {
  filtersCount: number;
  items: SearchDataItems;
  filters: ProductFilters;
}

export interface ProductFilters {
  [key: string]: SearchFiltersCategories[];
}

export interface SearchFiltersCategories {
  FeatureName: string;
  FeatureValue: string;
  FeatureUnit: string;
  FeatureID: string;
  FeatureValueDetails: {
    Value: string;
    Multiplier: string;
    MultiplierValue: string;
    Unit: string;
    Sign: string;
  };
  count: number;
  checked?: boolean;
}

export interface SearchDataItems {
  total_items: number;
  page_count: number;
  page: number;
  items: [ProductInterface];
}

export interface ProductFiltersWrapper {
  feature: ProductFilters;
  checked: boolean;
}

export interface AddFilterInterface extends ProductFiltersWrapper {
  filter: SearchFiltersCategories[];
  parameter: string;
  products?: number;
}

export interface FilterOptions {
  value: string;
  unit: string;
  checked: boolean;
  rawFilter: SearchFiltersCategories;
}
