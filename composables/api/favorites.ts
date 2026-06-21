import { useNuxtApp } from '#app';
import type {
  FavouriteFolderMoveInterface,
  FavouriteFolderRequestInterface,
} from '~/model/favourite-folder/request/favourite-folder.interface';
import type { FavouriteFolderResponse } from '~/model/favourite-folder/response/favourite-folder.interface';
import { useAuthStore } from '~/store/authStore';

const RESOURCE = '/user';

function getUserId() {
  const authStore = useAuthStore();
  return authStore.getCurrentUser?.user_id;
}

export async function fetchFavouriteList() {
  const { $apiClient } = useNuxtApp();
  const userId = getUserId();

  return await $apiClient<FavouriteFolderResponse>(`${RESOURCE}/${userId}/favourite`, {
    method: 'GET',
  });
}

export async function addEntityToFavouriteList(payload: FavouriteFolderRequestInterface) {
  const { $apiClient } = useNuxtApp();
  const userId = getUserId();

  return await $apiClient<FavouriteFolderRequestInterface>(`${RESOURCE}/${userId}/favourite`, {
    method: 'POST',
    body: payload,
  });
}

export async function removeEntityFromFavouriteList(entityId: string) {
  const { $apiClient } = useNuxtApp();
  const userId = getUserId();

  return await $apiClient<FavouriteFolderRequestInterface>(`${RESOURCE}/${userId}/favourite/${entityId}`, {
    method: 'DELETE',
  });
}

export async function copyEntityToFavouriteList(payload: FavouriteFolderMoveInterface) {
  const { $apiClient } = useNuxtApp();
  const userId = getUserId();

  return await $apiClient<FavouriteFolderMoveInterface>(`${RESOURCE}/${userId}/favourite/copy`, {
    method: 'POST',
    body: payload,
  });
}

export async function moveEntityToFavouriteList(payload: FavouriteFolderMoveInterface) {
  const { $apiClient } = useNuxtApp();
  const userId = getUserId();

  return await $apiClient<FavouriteFolderMoveInterface>(`${RESOURCE}/${userId}/favourite/move`, {
    method: 'POST',
    body: payload,
  });
}
