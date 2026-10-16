type MockOrdersApi = {
  validateAddress?: (address: unknown) => Promise<unknown>;
  sendOrder?: (order: unknown) => Promise<unknown>;
};

let mockRuntimeConfig: unknown = { public: {} };
let mockOrdersApi: MockOrdersApi = {};
let mockApiClient: <T>(resource: string, options?: { method?: string; body?: unknown }) => Promise<T> = async () => {
  throw new Error('Mock $apiClient was called without a handler');
};
const mockCookieValues: Record<string, unknown> = {};
let mockRouterPush: (location: unknown) => Promise<void> | void = async () => {};

export const __setMockApiClient = (client: typeof mockApiClient) => {
  mockApiClient = client;
};

export const __setMockCookie = (name: string, value: unknown) => {
  mockCookieValues[name] = value;
};

export const __setMockRuntimeConfig = (config: unknown) => {
  mockRuntimeConfig = config;
};

export const __setMockRouterPush = (push: typeof mockRouterPush) => {
  mockRouterPush = push;
};

export const __setMockOrdersApi = (ordersApi: MockOrdersApi) => {
  mockOrdersApi = ordersApi;
};

export const useRuntimeConfig = () => mockRuntimeConfig;

export const useRouter = () => ({
  push: mockRouterPush,
});

export const useRoute = () => ({
  path: '/',
});

export const useCookie = (name: string) => ({
  value: mockCookieValues[name],
});

(globalThis as typeof globalThis & { useCookie: typeof useCookie }).useCookie = useCookie;

export const useRequestURL = () => new URL('http://localhost:3000/');

(globalThis as typeof globalThis & { useRequestURL: typeof useRequestURL }).useRequestURL = useRequestURL;

export const useNuxtApp = () => ({
  $apiClient: mockApiClient,
  $api: {
    orders: {
      validateAddress: async (address: unknown) => mockOrdersApi.validateAddress?.(address),
      sendOrder: async (order: unknown) => mockOrdersApi.sendOrder?.(order),
    },
  },
});
