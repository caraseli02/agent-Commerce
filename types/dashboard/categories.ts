import type { Component } from 'vue';
import type { PriceSmartLinkingInterface } from '~/model/prices/price-settings.interface';

export interface TaxonomyInterface {
  id: string;
  name: string;
  averageWeight?: number;
  productCount?: number;
  products?: string[];
  subcategory?: TaxonomyInterface[];
  smartPricingSettings?: PriceSmartLinkingInterface;
  customProperties?: CustomPropertiesSettings;
  path: string;
  isPublished: boolean;
  icon?: string;
}

export interface ICreatePayload {
  name: string;
  icon: string;
  parentId?: string;
  enableSmartPricing?: boolean;
  enableCustomProperties?: boolean;
  smartPricingSettings?: SmartPricingSettings;
  customProperties?: CustomPropertiesSettings;
}

export interface SmartPricingSettings {
  priceRangeId: string;
  quantityId: string;
  marginId: string;
}

export interface CustomPropertiesSettings {
  avgItemWeight: number;
  width: number;
  height: number;
  length: number;
}

export type CategoriesMap = Record<string, string>;

export interface TaxonomyGetResponse {
  status: string;
  data: {
    _id: string;
    locked: boolean;
    data: TaxonomyInterface[];
  };
}

export interface CategoryMutationResponse {
  status: string;
  description?: string;
}

export interface NavCategoryView {
  id: string;
  name: string;
  path: string;
  isPublished: boolean;
  productCount?: number;
  icon: Component;
  subcategory: NavCategoryView[];
}
