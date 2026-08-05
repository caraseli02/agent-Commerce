import type { ProductInterface } from './response';
import type { SearchFiltersCategories } from './search';

export interface SearchSimilarProductRequest {
  filters: SearchFiltersCategories[];
}

export interface SearchSimilarProductResponse {
  data: SimilarProductData;
  status: string;
}

export interface SimilarProductData {
  count: number;
  items: ProductInterface[];
}
