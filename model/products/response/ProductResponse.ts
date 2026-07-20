export interface ProductResponse {
  data: [ProductInterface];
  status: string;
}

export interface ProductInterface {
  erpItemId?: string;
  path?: string;
  category?: string;
  active?: boolean;
  class?: string;
  name: string;
  alias?: string;
  description?: string;
  variant?: string | null;
  code?: string;
  manufacturer?: string;
  manufacturerCode?: string;
  stock: number;
  priceHistory: PriceHistoryInterface[];
  priceConfiguration?: PriceConfigurationInterface;
  measure: string;
  tags?: string[];
  details: ProductDetailsInterface;
  sold: number;
  adminSettings?: AdminSettings;
  additionalInfo?: AdditionalInfoInterface;
  favourite?: boolean;
  _id?: string;
}

export interface PriceConfigurationSettingsInterface {
  price: number;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceHistoryInterface {
  price: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceConfigurationInterface {
  smartLinkId: string;
  configuration: PriceConfigurationSettingsInterface[];
}

export interface ProductDetailsInterface {
  SummaryData: ProductSummaryDataInterface;
  ParametricData: ProductParametricDataInterface;
  ProductImage: ProductImageInterface;
}

export interface ProductImageInterface {
  ProductImageSmall: string;
  ProductImageLarge: string;
}

export interface ProductSummaryDataInterface {
  Datasheet: string;
  TaxonomyPath: string;
  TaxonomyPathIDs: string;
  SmallImageURL: string;
  PartDescription: string;
  Manufacturer: string;
}

export interface ProductParametricDataInterface {
  Features: ProductParametricDataFeaturesInterface[];
}

export interface ProductParametricDataFeaturesInterface extends CountInterface {
  FeatureName: string;
  FeatureValue: string;
  FeatureUnit: string;
  FeatureID?: string;
  FeatureValueDetails?: string;
}

export interface CountInterface {
  count?: number;
  checked?: boolean;
}

export interface DiscountInterface {
  value: number;
  startDate: string;
  endDate: string;
}

export interface AdditionalInfoInterface {
  searchedCount: number;
}

export interface AdminSettings {
  discount?: DiscountInterface;
  featured?: boolean;
}

export interface ProductDiscountsHelperInterface {
  userDiscount: number;
  productDiscount: number;
  discountPrice: number;
  currentConfigurationDiscountPrice: number;
  priceConfiguration: PriceConfigurationSettingsInterface;
  minimumOrderQuantityConfiguration: PriceConfigurationSettingsInterface;
}
