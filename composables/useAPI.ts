import type { UseFetchOptions } from 'nuxt/app';

export function useAPI<T>(url: string | (() => string), options?: UseFetchOptions<T>) {
    const { $apiClient } = useNuxtApp();
    return useFetch(url, {
        ...options,
        $fetch: $apiClient as typeof $fetch,
    });
}
