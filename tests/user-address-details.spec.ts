import { beforeAll, describe, expect, it, vi } from 'vitest';

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body ?? {});
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
    const error = new Error(payload.statusMessage) as Error & { statusCode?: number };
    error.statusCode = payload.statusCode;
    return error;
  });
};

describe('signed-in address setup', () => {
  beforeAll(installH3Mocks);

  it('returns newly saved shipping and billing addresses when checkout refreshes the customer profile', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const shippingHandler = (await import('../server/api/user/shipping-address/index.post')).default as (
      event: unknown,
    ) => Promise<unknown>;
    const billingHandler = (await import('../server/api/user/billing-address/index.post')).default as (event: unknown) => Promise<unknown>;
    const detailsHandler = (await import('../server/api/user/[userId]/details.get')).default as unknown as (event: unknown) => unknown;
    const token = createMockToken('mock-customer-1');
    const headers = { authorization: `Bearer ${token}` };
    const shipping = {
      alias: 'Checkout Shipping',
      name1: '42 Checkout Way',
      name2: '',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      postcode: '94105',
      default: true,
    };
    const billing = { ...shipping, alias: 'Checkout Billing', name1: '84 Billing Way' };

    await shippingHandler({ headers, body: { address: shipping } });
    await billingHandler({ headers, body: { address: billing } });
    const response = (await detailsHandler({
      headers,
      params: { userId: 'mock-customer-1' },
    })) as {
      status: string;
      data: {
        personalDetails?: {
          shippingAddress: Array<{ alias?: string; default: boolean }>;
          billingAddress: Array<{ alias?: string; default: boolean }>;
        };
      };
    };

    expect(response.status).toBe('success');
    expect(response.data.personalDetails?.shippingAddress).toEqual(
      expect.arrayContaining([expect.objectContaining({ alias: 'Checkout Shipping', default: true })]),
    );
    expect(response.data.personalDetails?.billingAddress).toEqual(
      expect.arrayContaining([expect.objectContaining({ alias: 'Checkout Billing', default: true })]),
    );
  });
});
