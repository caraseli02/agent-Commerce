import type { ProductImageInterface, ProductParametricDataInterface, ProductSummaryDataInterface } from './ProductResponse';

export interface ProductDetailResponse {
  status: string;
  data: ProductDetail;
}

export interface ProductDetail {
  _id: string;
  class: string;
  alias: string;
  name: string;
  description: string;
  variant: string | null;
  manufacturer: string;
  manufacturerCode: string;
  stock: number;
  priceRon: number;
  priceEur: number;
  sold: number;
  adminSettings: {
    featured: boolean;
    stockClearance: boolean;
  };
  additionalInfo: {
    searchedCount: number;
  };
  details: ProductDetails;
}

export interface ProductDetails {
  SummaryData: ProductSummaryDataInterface;
  ParametricData: ProductParametricDataInterface;
  ProductImage: ProductImageInterface;
}
