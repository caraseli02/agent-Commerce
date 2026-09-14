import type { $Fetch } from 'ofetch';
import { describe, expect, it, vi } from 'vitest';

import { fetchOrders, fetchWidget, getOrderById, sendOrder } from '~/composables/api/orders';
import type { OrderRequestInterface } from '~/types';

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

  it('reuses the same checkout request ID when transport fails before the response is received', async () => {
    const requests: Array<{ body?: Record<string, unknown> }> = [];
    const apiClient = vi.fn(async (_url: string, options: Record<string, unknown>) => {
      requests.push({
        body: options.body as Record<string, unknown>,
      });

      if (requests.length === 1) {
        throw new Error('response lost');
      }

      return {
        status: 'success',
        data: {
          orderId: 'order-idempotent-1',
          status: 1,
          useExistingPaymentMethod: false,
        },
      };
    }) as unknown as $Fetch;

    const order = {
      cartId: 'cart-idempotency-test',
      reviewedCartRevision: '7',
      reviewedQuoteFingerprint: 'quote-7',
      products: [
        {
          id: 'prod-1',
          stock: 1,
          backorder_stock: 0,
        },
      ],
      shippingDetails: {
        address: {
          name1: 'Main Street 1',
        },
      },
      paymentDetails: {
        type: 2,
      },
      shippingCost: 9.99,
      type: 0,
      notes: [],
    } as unknown as OrderRequestInterface;

    await expect(sendOrder(order, apiClient)).rejects.toThrow('response lost');
    await expect(sendOrder(order, apiClient)).resolves.toMatchObject({
      status: 'success',
      data: {
        orderId: 'order-idempotent-1',
      },
    });

    const firstRequestId = requests[0]?.body?.checkoutRequestId;
    const secondRequestId = requests[1]?.body?.checkoutRequestId;

    expect(typeof firstRequestId).toBe('string');
    expect(firstRequestId).toBe(secondRequestId);
  });
});
