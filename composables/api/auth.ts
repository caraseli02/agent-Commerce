import { useNuxtApp } from '#app';
import useFirebaseAuth from '~/composables/useFirebaseAuth';
import type { LoginRequest } from '~/model/auth/request/LoginRequest';
import type { ProductResponse } from '~/model/products/response/ProductResponse';
import type {
  FirebaseBusinessAccount as SignupBusinessPayload,
  FirebasePersonalAccount as SignupPersonalPayload,
  UserDetailsResponse,
} from '~~/types';

const RESOURCE = '/auth';

export async function login(payload: LoginRequest): Promise<ProductResponse> {
  const config = useRuntimeConfig();
  const loginUrl = config.public.MOCK_MODE ? `/api${RESOURCE}/login` : `${config.public.BASE_URL_API}${RESOURCE}/login`;

  // Use plain $fetch so a failed sign-in 401 does not trigger the global apiClient redirect.
  return await $fetch<ProductResponse>(loginUrl, {
    method: 'POST',
    body: payload,
  });
}

export async function registerFirebase(payload: SignupPersonalPayload | SignupBusinessPayload) {
  const { $apiClient } = useNuxtApp();
  const token = await useFirebaseAuth().getUserToken();

  return await $apiClient(`${RESOURCE}/firebase/register`, {
    method: 'POST',
    body: payload,
    ...(token
      ? {
          headers: { Authorization: `Bearer ${token}` },
        }
      : {}),
  });
}

export async function registerClassic(payload: SignupPersonalPayload | SignupBusinessPayload) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient(`${RESOURCE}/register`, {
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
