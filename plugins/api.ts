import { $fetch, type $Fetch, type FetchOptions } from 'ofetch';
import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/store/authStore';

import { deleteNotificationById, fetchGetNotifications, markNotificationAsRead } from '~/composables/api/notifications';
import ControlPanelService from '~/services/dashboard/control-panel.service';
import OrdersService from '~/services/dashboard/orders.service';
import CartService from '~/services/cart.service';
import SmartPricingService from '~/services/dashboard/smart-pricing.service';

/** ApiInstance interface provides us with good typing */
export interface IApiInstance {
  cart: CartService;
  notifications: {
    fetchGetNotifications: typeof fetchGetNotifications;
    fetchMarkNotificationAsRead: typeof markNotificationAsRead;
    deleteNotificationById: typeof deleteNotificationById;
  };
  controlPanel: ControlPanelService;
  orders: OrdersService;
  smartPricing: SmartPricingService;
}

declare module '#app' {
  interface NuxtApp {
    $api: IApiInstance;
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

      const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers as HeadersInit | undefined);

      headers.set('Authorization', `Bearer ${token}`);
      options.headers = headers;
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

  /** an object containing all repositories we need to expose */
  const modules: IApiInstance = {
    cart: new CartService(apiFetcher),
    notifications: {
      fetchGetNotifications,
      fetchMarkNotificationAsRead: markNotificationAsRead,
      deleteNotificationById,
    },
    controlPanel: new ControlPanelService(apiFetcher),
    orders: new OrdersService(apiFetcher),
    smartPricing: new SmartPricingService(apiFetcher),
  };

  return {
    provide: {
      api: modules,
      apiClient: apiFetcher,
    },
  };
});
