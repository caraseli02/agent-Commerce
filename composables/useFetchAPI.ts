import type { UseFetchOptions } from '#app';

export function useFetchAPI(url: string, params: UseFetchOptions<unknown> = {}) {
    const cookie = useCookie('token');
    const runtimeConfig = useRuntimeConfig();
    const { onRequest: userOnRequest, ...restParams } = params;

    return useFetch(url, {
        ...restParams,
        baseURL: runtimeConfig.public.BASE_URL_API,
        key: restParams.key ?? url,
        onRequest(context) {
            const headers = new Headers(context.options.headers as HeadersInit);

            if (cookie.value) {
                headers.set('Authorization', `Bearer ${cookie.value}`);
            }

            context.options.headers = headers;

            if (typeof userOnRequest === 'function') {
                return userOnRequest(context);
            }
        },
    });
}
