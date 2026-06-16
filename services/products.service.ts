import HttpFactory from '@/composables/HttpFactory';
import type { SearchSimilarProductRequest } from '~/model/products/request/SearchSimilarProductRequest';
import type { NewProductResponse } from '~/model/products/response/NewProductResponse';
import type { ProductParametricDataFeaturesInterface, ProductResponse } from '~/model/products/response/ProductResponse';
import type { ProductSearchResponse } from '~/model/products/response/ProductSearchResponse';
import type { SearchSimilarProductResponse } from '~/model/products/response/SearchSimilarProductResponse';
import type { ProductDetailResponse } from '~/model/products/response/ProductDetailResponse';

class ProductService extends HttpFactory {
  private RESOURCE = '/products';

  async fetchSingleProduct(id: string): Promise<ProductDetailResponse> {
    return await this.call<ProductDetailResponse>('GET', `${this.RESOURCE}/${id}`, null);
  }

  async fetchProductTab(path: string): Promise<ProductResponse> {
    return await this.call<ProductResponse>('GET', `${this.RESOURCE}/${path}`, null);
  }

  async fetchNewProducts(): Promise<NewProductResponse> {
    return await this.call<NewProductResponse>('GET', `${this.RESOURCE}/new-products`, null);
  }

  async fetchSearchProduct(
    keyword: string,
    category: string | null,
        page = 1,
        perPage = 10,
        sort = {},
        additionalfilters = {},
        featuresFilters: ProductParametricDataFeaturesInterface[] = [],
  ): Promise<ProductSearchResponse> {
    let filters = {};

    if (!keyword || keyword === '') {
      filters = { page: page, perPage: perPage, ...sort };
    }
    else {
      keyword = keyword.trim();

      filters = {
        page: page,
        perPage: perPage,
        ...sort,
        operator: '$or',
        code: keyword,
        description: keyword,
        alias: keyword,
        name: keyword,
        manufacturer: keyword,
        manufacturerCode: keyword,
      };
    }

    if (category) {
      filters = { ...filters, category };
    }

    if (additionalfilters) {
      filters = { ...filters, ...additionalfilters };
    }

    const fetchExtras: Record<string, unknown> = { params: filters };

    return await this.call<ProductSearchResponse>(
      'POST',
      `${this.RESOURCE}/search`,
      {
        filters: featuresFilters,
      },
      fetchExtras,
    );
  }

  async fetchProductByCriteria(payload: SearchSimilarProductRequest): Promise<SearchSimilarProductResponse> {
    return await this.call<SearchSimilarProductResponse>('POST', `${this.RESOURCE}/filters/search`, payload);
  }
}

export default ProductService;
