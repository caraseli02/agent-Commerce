import type { ProductImageInterface } from './response';

export interface NewProducts {
  _id: string;
  additionalInfo: {
    searchedCount: number;
  };
  adminSettings: {
    featured: boolean;
  };
  alias: string;
  class: string;
  description: string;
  details: {
    ProductImage: ProductImageInterface;
  };
  manufacturer: string;
  manufacturerCode: string;
  priceEur: number;
  priceRon: number;
  sold: number;
  stock: number;
  varian: string | null;
}

export interface NewProductResponse {
  data: [NewProducts];
  status: string;
}
