import { useNuxtApp } from '#app';
import { useAuthStore } from '~/store/authStore';
import type {
  AddToCartRequestInterface,
  DeleteProductCartRequestInterface,
  UpdateProductCartRequestInterface,
} from '~/model/cart/request/cart.interface';
import type { CartProductsInterface, CartResponse } from '~/model/cart/response/cart.interface';

const RESOURCE = '/cart';

function getCurrentUserId() {
  const authStore = useAuthStore();
  return authStore.getCurrentUser?.user_id;
}

export async function fetchCartList() {
  const { $apiClient } = useNuxtApp();
  const token = useCookie('token').value;

  if (!token) {
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
