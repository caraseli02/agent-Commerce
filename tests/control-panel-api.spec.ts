import { describe, expect, it } from 'vitest';
import type { $Fetch } from 'ofetch';
import type { UserInterface } from '../types/auth/user-interface';

type ApiRequest = {
  resource: string;
  method?: string;
  body?: unknown;
  params?: unknown;
};

describe('control-panel API adapter', () => {
  it('routes shipping and billing address requests through the injected API client', async () => {
    const apiRequests: ApiRequest[] = [];
    const apiClient = async <T>(
      resource: string,
      options?: {
        method?: string;
        body?: unknown;
        params?: unknown;
      },
    ): Promise<T> => {
      apiRequests.push({
        resource,
        method: options?.method,
        body: options?.body,
        params: options?.params,
      });
      return { status: 'success', data: 'ok' } as T;
    };
    const fetchClient = apiClient as unknown as $Fetch;
    const address = {
      _id: 'addr-1',
      alias: 'HQ',
      name1: '5073 Mark Brown Rd',
      name2: '',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      postcode: '94105',
      phone: '+1-202-555-0100',
      default: true,
    };
    const controlPanelApi = await import('../composables/api/control-panel');

    await controlPanelApi.fetchShipping('customer-1', 0, fetchClient);
    await controlPanelApi.fetchBilling('customer-1', 1, fetchClient);
    await controlPanelApi.addShipping(address, 'customer-1', fetchClient);
    await controlPanelApi.updateShipping(address, 'customer-1', fetchClient);
    await controlPanelApi.deleteShipping('addr-1', 'customer-1', fetchClient);
    await controlPanelApi.addBilling(address, 'customer-1', fetchClient);
    await controlPanelApi.updateBilling(address, 'customer-1', fetchClient);
    await controlPanelApi.deleteBilling('addr-1', 'customer-1', fetchClient);

    expect(apiRequests).toEqual([
      {
        resource: '/dashboard/control-panel/customer-1/personal',
        method: 'GET',
        body: undefined,
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/customer-1/organization',
        method: 'GET',
        body: undefined,
        params: undefined,
      },
      {
        resource: 'user/shipping-address/customer-1',
        method: 'POST',
        body: { address },
        params: undefined,
      },
      {
        resource: 'user/shipping-address/customer-1',
        method: 'PATCH',
        body: { address },
        params: undefined,
      },
      {
        resource: 'user/shipping-address/addr-1',
        method: 'DELETE',
        body: undefined,
        params: { userId: 'customer-1' },
      },
      {
        resource: 'user/billing-address/customer-1',
        method: 'POST',
        body: { address },
        params: undefined,
      },
      {
        resource: 'user/billing-address/customer-1',
        method: 'PATCH',
        body: { address },
        params: undefined,
      },
      {
        resource: 'user/billing-address/addr-1',
        method: 'DELETE',
        body: undefined,
        params: { userId: 'customer-1' },
      },
    ]);
  });

  it('routes settings, account details, transactions, and activity logs through the injected API client', async () => {
    const apiRequests: ApiRequest[] = [];
    const apiClient = async <T>(
      resource: string,
      options?: {
        method?: string;
        body?: unknown;
        params?: unknown;
      },
    ): Promise<T> => {
      apiRequests.push({
        resource,
        method: options?.method,
        body: options?.body,
        params: options?.params,
      });
      return { status: 'success', data: 'ok' } as T;
    };
    const fetchClient = apiClient as unknown as $Fetch;
    const account = { firebaseId: 'customer-1', email: 'buyer@example.com' } as unknown as UserInterface;
    const controlPanelApi = await import('../composables/api/control-panel');

    await controlPanelApi.fetchCustomerSettings('customer-1', fetchClient);
    await controlPanelApi.markSettingsAsRead({ key: 'marketing', email: true }, 'email', 'customer-1', fetchClient);
    await controlPanelApi.fetchCustomerDiscount('customer-1', fetchClient);
    await controlPanelApi.updateCustomerDiscount(12, 'customer-1', fetchClient);
    await controlPanelApi.fetchCustomerCredit('customer-1', fetchClient);
    await controlPanelApi.updateCustomerCredit(30, '5000', 'customer-1', fetchClient);
    await controlPanelApi.toggleCloseCustomerCredit('customer-1', fetchClient);
    await controlPanelApi.toggleFreezeCustomerCredit('customer-1', fetchClient);
    await controlPanelApi.fetchAccountDetails('customer-1', 0, fetchClient);
    await controlPanelApi.updateAccountDetails('customer-1', account, 1, fetchClient);
    await controlPanelApi.fetchTransactions(2, 25, { status: 'paid' }, { sortBy: 'createdAt' }, fetchClient);
    await controlPanelApi.fetchActivityLogs(3, 10, { event: 'login' }, { sortBy: 'createdAt' }, fetchClient);

    expect(apiRequests).toEqual([
      {
        resource: '/dashboard/control-panel/settings/customer-1',
        method: 'GET',
        body: undefined,
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/settings/customer-1',
        method: 'POST',
        body: {
          setting: {
            name: 'marketing',
            value: true,
            option: 'email',
          },
        },
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/settings/discount/customer-1',
        method: 'GET',
        body: undefined,
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/settings/discount/customer-1',
        method: 'PUT',
        body: { value: 12 },
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/settings/customer-credit/customer-1',
        method: 'GET',
        body: undefined,
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/settings/customer-credit/customer-1',
        method: 'PUT',
        body: { term: 30, limit: '5000' },
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/settings/customer-credit/close/customer-1',
        method: 'PUT',
        body: undefined,
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/settings/customer-credit/freeze/customer-1',
        method: 'PUT',
        body: undefined,
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/customer-1/personal',
        method: 'GET',
        body: undefined,
        params: undefined,
      },
      {
        resource: '/dashboard/control-panel/customer-1/organization',
        method: 'POST',
        body: account,
        params: undefined,
      },
      {
        resource: '/transaction',
        method: 'GET',
        body: undefined,
        params: {
          page: 2,
          perPage: 25,
          status: 'paid',
          sortBy: 'createdAt',
        },
      },
      {
        resource: '/audit',
        method: 'GET',
        body: undefined,
        params: {
          page: 3,
          perPage: 10,
          event: 'login',
          sortBy: 'createdAt',
        },
      },
    ]);
  });
});
