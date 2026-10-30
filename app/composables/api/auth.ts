import { useNuxtApp } from '#app';
import type { LoginRequest } from '~~/model/auth/request/LoginRequest';
import type { ProductResponse } from '~~/types/product';
import type { UserDetailsResponse } from '~~/types';

const RESOURCE = '/auth';

export async function login(payload: LoginRequest): Promise<ProductResponse> {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ProductResponse>(`${RESOURCE}/login`, {
    method: 'POST',
    body: payload,
  });
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function register(payload: RegisterRequest) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; token: string; user: unknown }>(`${RESOURCE}/register`, {
    method: 'POST',
    body: payload,
  });
}

export async function verifyEmail(code: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient('user/email/verify', {
    method: 'POST',
    body: { code },
  });
}

export async function fetchUserDetails(userId: string, token?: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<UserDetailsResponse>(`user/${userId}/details`, {
    method: 'GET',
    ...(token
      ? {
          headers: { Authorization: `Bearer ${token}` },
        }
      : {}),
  });
}
