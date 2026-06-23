type MockOrdersApi = {
  validateAddress?: (address: unknown) => Promise<unknown>;
  sendOrder?: (order: unknown) => Promise<unknown>;
};

let mockCartResponse: unknown = null;
let mockRuntimeConfig: unknown = { public: {} };
let mockOrdersApi: MockOrdersApi = {};
let mockApiClient: <T>(resource: string, options?: { method?: string; body?: unknown }) => Promise<T> = async () => {
  throw new Error('Mock $apiClient was called without a handler');
};
const mockCookieValues: Record<string, unknown> = {};
let legacyCartApiEnabled = true;
let mockRouterPush: (location: unknown) => Promise<void> | void = async () => {};

export const __setMockCartResponse = (response: unknown) => {
  mockCartResponse = response;
};

export const __setMockApiClient = (client: typeof mockApiClient) => {
  mockApiClient = client;
};

export const __setMockCookie = (name: string, value: unknown) => {
  mockCookieValues[name] = value;
};

export const __setLegacyCartApiEnabled = (enabled: boolean) => {
  legacyCartApiEnabled = enabled;
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

export const useNuxtApp = () => ({
  $apiClient: mockApiClient,
  $api: {
    cart: {
      addEntityToCart: async () => {
        if (!legacyCartApiEnabled) {
          throw new Error('Legacy cart API addEntityToCart should not be used');
        }

        return null;
      },
      fetchCartList: async () => {
        if (!legacyCartApiEnabled) {
          throw new Error('Legacy cart API fetchCartList should not be used');
        }

        return mockCartResponse;
      },
    },
    orders: {
      validateAddress: async (address: unknown) => mockOrdersApi.validateAddress?.(address),
      sendOrder: async (order: unknown) => mockOrdersApi.sendOrder?.(order),
    },
  },
});
