import HttpFactory from '@/composables/HttpFactory';
import type { CategoryMutationResponse, ICreatePayload, TaxonomyGetResponse } from '~/types/dashboard/categories';

class CategoriesService extends HttpFactory {
  private RESOURCE = '/taxonomy';

  async create(taxonomyId: string, payload: ICreatePayload) {
    return await this.call<CategoryMutationResponse>('POST', `${this.RESOURCE}/${taxonomyId}/category`, payload);
  }

  async get() {
    return await this.call<TaxonomyGetResponse>('GET', `${this.RESOURCE}`);
  }

  async delete(taxonomyId: string, categoryIds: string[]) {
    return await this.call<CategoryMutationResponse>('DELETE', `${this.RESOURCE}/${taxonomyId}/category`, { categoryIds });
  }

  async update(taxonomyId: string, categoryId: string, payload: ICreatePayload) {
    return await this.call<CategoryMutationResponse>('PATCH', `${this.RESOURCE}/${taxonomyId}/category/${categoryId}`, payload);
  }

  async toggleStatus(taxonomyId: string, categoryId: string) {
    return await this.call<CategoryMutationResponse>('PATCH', `${this.RESOURCE}/${taxonomyId}/category/${categoryId}/toggle-status`);
  }

  async merge(taxonomyId: string, sourceIds: string[], targetID: string) {
    return await this.call<CategoryMutationResponse>('POST', `${this.RESOURCE}/${taxonomyId}/category/merge/${targetID}`, {
      sourceIds,
    });
  }

  async move(taxonomyId: string, categoryIds: string[], parentId: string) {
    return await this.call<CategoryMutationResponse>('POST', `${this.RESOURCE}/${taxonomyId}/category/move/${parentId}`, {
      categoryIds,
    });
  }

  async duplicate(taxonomyId: string, sourceId: string, parentId?: string) {
    const endpoint = parentId
      ? `${this.RESOURCE}/${taxonomyId}/category/${sourceId}/copy/${parentId}`
      : `${this.RESOURCE}/${taxonomyId}/category/${sourceId}/copy`;

    return await this.call<CategoryMutationResponse>('POST', endpoint);
  }
}

export default CategoriesService;
