import { useNuxtApp } from '#app';
import type { CategoryMutationResponse, ICreatePayload, TaxonomyGetResponse } from '~/types/dashboard/categories';

const RESOURCE = '/taxonomy';

export async function getCategories() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<TaxonomyGetResponse>(`${RESOURCE}`, {
    method: 'GET',
  });
}

export async function createCategory(taxonomyId: string, payload: ICreatePayload) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CategoryMutationResponse>(`${RESOURCE}/${taxonomyId}/category`, {
    method: 'POST',
    body: payload,
  });
}

export async function deleteCategories(taxonomyId: string, categoryIds: string[]) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CategoryMutationResponse>(`${RESOURCE}/${taxonomyId}/category`, {
    method: 'DELETE',
    body: { categoryIds },
  });
}

export async function updateCategory(taxonomyId: string, categoryId: string, payload: ICreatePayload) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CategoryMutationResponse>(`${RESOURCE}/${taxonomyId}/category/${categoryId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function toggleCategoryStatus(taxonomyId: string, categoryId: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CategoryMutationResponse>(`${RESOURCE}/${taxonomyId}/category/${categoryId}/toggle-status`, {
    method: 'PATCH',
  });
}

export async function duplicateCategory(taxonomyId: string, sourceId: string, parentId?: string) {
  const { $apiClient } = useNuxtApp();
  const endpoint = parentId
    ? `${RESOURCE}/${taxonomyId}/category/${sourceId}/copy/${parentId}`
    : `${RESOURCE}/${taxonomyId}/category/${sourceId}/copy`;

  return await $apiClient<CategoryMutationResponse>(endpoint, {
    method: 'POST',
  });
}

export async function mergeCategories(taxonomyId: string, sourceIds: string[], targetID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CategoryMutationResponse>(`${RESOURCE}/${taxonomyId}/category/merge/${targetID}`, {
    method: 'POST',
    body: { sourceIds },
  });
}

export async function moveCategories(taxonomyId: string, categoryIds: string[], parentId: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CategoryMutationResponse>(`${RESOURCE}/${taxonomyId}/category/move/${parentId}`, {
    method: 'POST',
    body: { categoryIds },
  });
}
