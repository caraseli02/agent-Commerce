type MockOrdersApi = {
  validateAddress?: (address: unknown) => Promise<unknown>;
  sendOrder?: (order: unknown) => Promise<unknown>;
};

let mockCartResponse: unknown = null;
let mockRuntimeConfig: unknown = { public: {} };
let mockOrdersApi: MockOrdersApi = {};

export const __setMockCartResponse = (response: unknown) => {
  mockCartResponse = response;
};

export const __setMockRuntimeConfig = (config: unknown) => {
  mockRuntimeConfig = config;
};

export const __setMockOrdersApi = (ordersApi: MockOrdersApi) => {
  mockOrdersApi = ordersApi;
};

export const useRuntimeConfig = () => mockRuntimeConfig;

export const useNuxtApp = () => ({
  $api: {
    cart: {
      addEntityToCart: async () => null,
      fetchCartList: async () => mockCartResponse,
    },
    orders: {
      validateAddress: async (address: unknown) => mockOrdersApi.validateAddress?.(address),
      sendOrder: async (order: unknown) => mockOrdersApi.sendOrder?.(order),
    },
  },
});
