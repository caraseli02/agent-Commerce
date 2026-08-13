import type { $Fetch } from 'ofetch';
import { describe, expect, it, vi } from 'vitest';

import { fetchOrders, fetchWidget, getOrderById } from '~/composables/api/orders';

describe('dashboard orders API adapters', () => {
  it('fetchWidget requests the selected dashboard metric with its time range', async () => {
    const apiClient = vi.fn(async (url: string, options: Record<string, unknown>) => ({
      url,
      options,
    })) as unknown as $Fetch;

    const response = await fetchWidget('gross-revenue', 7, apiClient);

    expect(apiClient).toHaveBeenCalledWith('/dashboard/orders/admin/gross-revenue', {
      method: 'GET',
      params: {
        time: 7,
      },
    });
    expect(response).toEqual({
      url: '/dashboard/orders/admin/gross-revenue',
      options: {
        method: 'GET',
        params: {
          time: 7,
        },
      },
    });
  });

  it('fetchOrders forwards paging, filters, and sort parameters to the shared client', async () => {
    const apiClient = vi.fn(async (url: string, options: Record<string, unknown>) => ({
      url,
      options,
    })) as unknown as $Fetch;

    const response = await fetchOrders(
      3,
      25,
      {
        status: 'processing',
        userId: 'customer-001',
      },
      {
        sort: 'desc',
      },
      apiClient,
    );

    expect(apiClient).toHaveBeenCalledWith('/orders', {
      method: 'GET',
      params: {
        page: 3,
        perPage: 25,
        status: 'processing',
        userId: 'customer-001',
        sort: 'desc',
      },
    });
    expect(response).toEqual({
      url: '/orders',
      options: {
        method: 'GET',
        params: {
          page: 3,
          perPage: 25,
          status: 'processing',
          userId: 'customer-001',
          sort: 'desc',
        },
      },
    });
  });

  it('getOrderById requests the single-order endpoint through the shared client', async () => {
    const apiClient = vi.fn(async (url: string, options: Record<string, unknown>) => ({
      url,
      options,
    })) as unknown as $Fetch;

    const response = await getOrderById('order-123', apiClient);

    expect(apiClient).toHaveBeenCalledWith('/orders/order-123', {
      method: 'GET',
    });
    expect(response).toEqual({
      url: '/orders/order-123',
      options: {
        method: 'GET',
      },
    });
  });
});
