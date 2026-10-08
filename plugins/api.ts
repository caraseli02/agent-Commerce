import { $fetch, type $Fetch, type FetchOptions } from 'ofetch';
import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/store/authStore';
import { withSessionAuthorization } from '~/composables/api/authorization';

declare module '#app' {
  interface NuxtApp {
    $apiClient: $Fetch;
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = nuxtApp.$config.public;

  const baseURL = (() => {
    if (!config.MOCK_MODE) {
      return config.BASE_URL_API;
    }

    if (import.meta.client) {
      return '/api';
    }

    const event = nuxtApp.ssrContext?.event;
    const protoHeader = event?.node.req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'http';
    const host = event?.node.req.headers.host || 'localhost:3000';

    return `${protocol}://${host}/api`;
  })();

  const fetchOptions: FetchOptions = {
    baseURL,
    onRequest({ options }) {
      const token = useCookie('token').value;
      if (!token) return;

      options.headers = withSessionAuthorization(options.headers as HeadersInit | undefined, token);
    },
    async onResponseError({ response }) {
      if (response.status !== 401) return;

      await nuxtApp.runWithContext(async () => {
        await useAuthStore().signOut();
        await navigateTo('/?signin=true');
      });
    },
  };

  /** create a new instance of $fetcher with custom option */
  const apiFetcher = $fetch.create(fetchOptions);

  return {
    provide: {
      apiClient: apiFetcher,
    },
  };
});
