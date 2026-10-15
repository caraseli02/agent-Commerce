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
  // Fetch hooks can run after Nuxt's setup context has ended. Capture the
  // request's reactive cookie here instead of calling a composable in a hook.
  const tokenCookie = useCookie<string | null>('token');

  const baseURL = (() => {
    if (!config.MOCK_MODE) {
      return config.BASE_URL_API;
    }

    if (import.meta.client) {
      return '/api';
    }

    // Internal Nitro fetch also works on protected Vercel previews: no
    // self-HTTP request crosses deployment authentication.
    return '/api';
  })();

  const fetchOptions: FetchOptions = {
    baseURL,
    onRequest({ options }) {
      const token = tokenCookie.value;
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
  const requestFetch = config.MOCK_MODE ? nuxtApp.ssrContext?.event.fetch : undefined;
  // Nitro's event.fetch spreads init.headers, and spreading a Headers instance drops every
  // header (including Authorization), so hand it a plain object.
  const apiFetcher = $fetch.create(
    fetchOptions,
    requestFetch
      ? {
          fetch: (input, init) =>
            requestFetch(
              input instanceof URL ? input.href : input,
              init?.headers instanceof Headers ? { ...init, headers: Object.fromEntries(init.headers) } : init,
            ),
        }
      : undefined,
  );

  return {
    provide: {
      apiClient: apiFetcher,
    },
  };
});
