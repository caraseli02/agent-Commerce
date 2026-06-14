import type { $Fetch, FetchOptions } from 'ofetch';

type ApiFetcher = <T>(url: string, options?: FetchOptions) => Promise<T>;

class HttpFactory {
    private readonly $fetch: ApiFetcher;

    constructor(fetcher: $Fetch) {
        this.$fetch = fetcher as ApiFetcher;
    }

    async call<T>(method: string, url: string, data?: object | null, extras: FetchOptions = {}): Promise<T> {
        const apiOptions: FetchOptions = { method, ...extras };
        if (data) {
            apiOptions.body = data;
        }
        return await this.$fetch<T>(url, apiOptions);
    }
}

export default HttpFactory;
