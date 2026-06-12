import type { $Fetch, FetchOptions } from 'ofetch';
import { useAuthStore } from '~/store/authStore';

type FetchError = {
    response?: {
        status?: number;
    };
};

type ApiFetcher = <T>(url: string, options?: FetchOptions) => Promise<T>;

class HttpFactory {
    private readonly $fetch: ApiFetcher;

    constructor(fetcher: $Fetch) {
        this.$fetch = fetcher as ApiFetcher;
    }

    /**
     * method - GET, POST, PUT
     * URL
     **/
    async call<T>(
        method: string,
        url: string,
        data?: object | null,
        extras: FetchOptions = {},
        options: { handle401?: boolean } = {}
    ): Promise<T> {
        const authStore = useAuthStore();

        try {
            const apiOptions: FetchOptions = { method, ...extras };
            if (data) {
                apiOptions.body = data;
            }
            return await this.$fetch<T>(url, apiOptions);
        } catch (err: unknown) {
            const fetchError = err as FetchError;
            // Only handle 401 if explicitly requested (default: true for backward compatibility)
            if (options.handle401 !== false && fetchError.response?.status === 401) {
                const router = useRouter();
                authStore.signOut();
                router.push('/?signin=true');
                throw new Error('Session expired. Please log in again.');
            }
            throw err;
        }
    }
}

export default HttpFactory;
