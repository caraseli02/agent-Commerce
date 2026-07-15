import { useNuxtApp, useRuntimeConfig } from '#app';
import { useAuthStore } from '~/store/authStore';
import type {
  AddToCartRequestInterface,
  CartProductsInterface,
  CartResponse,
  DeleteProductCartRequestInterface,
  UpdateProductCartRequestInterface,
} from '~/types/cart';

const RESOURCE = '/cart';

function getCurrentUserId() {
  const authStore = useAuthStore();
  return authStore.getCurrentUser?.user_id;
}

export async function fetchCartList() {
  const { $apiClient } = useNuxtApp();
  const config = useRuntimeConfig();
  const token = useCookie('token').value;

  if (!token && !config.public.MOCK_MODE) {
    return null;
  }

  return await $apiClient<CartResponse>(RESOURCE, {
    method: 'GET',
  });
}

export async function addEntityToCart(payload: AddToCartRequestInterface) {
  const { $apiClient } = useNuxtApp();
  const userId = getCurrentUserId();

  if (userId) {
    payload.userId = userId;
  }

  return await $apiClient<CartResponse>(RESOURCE, {
    method: 'POST',
    body: payload,
  });
}

export async function removeEntityFromCart(payload: DeleteProductCartRequestInterface) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CartResponse>(RESOURCE, {
    method: 'DELETE',
    body: payload,
  });
}

export async function updateEntityFromCart(payload: UpdateProductCartRequestInterface) {
  const { $apiClient } = useNuxtApp();
  const userId = getCurrentUserId();

  if (userId) {
    payload.userId = userId;
  }

  return await $apiClient<CartResponse>(RESOURCE, {
    method: 'PUT',
    body: payload,
  });
}

export async function fetchCartProducts() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CartProductsInterface>(RESOURCE, {
    method: 'GET',
  });
}
