import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

let checkoutStoreDir = '';

const orderInput = {
  shippingCost: 19.9,
  type: 0,
  shippingDetails: {
    address: { name1: 'Demo Street 10' },
    billingAddress: { name1: 'Demo Street 10' },
  },
  paymentDetails: { type: 0 },
  notes: [],
};

describe('durable PlaceOrder persistence', () => {
  beforeAll(() => {
    checkoutStoreDir = mkdtempSync(join(tmpdir(), 'place-order-persistence-'));
    process.env.CHECKOUT_DATABASE_PATH = join(checkoutStoreDir, 'checkout.sqlite');
  });

  afterAll(() => {
    delete process.env.CHECKOUT_DATABASE_PATH;
    rmSync(checkoutStoreDir, { recursive: true, force: true });
  });

  it('replays, reads, and lists one checkout across independent service instances', async () => {
    const [{ getMockCartForUser, addProductsToMockCart }, { getMockUserById }, { placeOrder }] = await Promise.all([
      import('../server/utils/mockCart'),
      import('../server/utils/mockUsers'),
      import('../server/application/checkout/place-order'),
    ]);
    const user = getMockUserById('mock-customer-1');
    expect(user).toBeDefined();

    const cart = await getMockCartForUser('mock-customer-1');
    await addProductsToMockCart(cart, [{ id: 'prod-1', stock: 1, isFolder: false }]);

    const first = await placeOrder({
      checkoutRequestId: 'checkout-durable-1',
      cartId: String(cart._id),
      cartOwnerId: 'mock-customer-1',
      user: user!,
      order: orderInput,
    });

    vi.resetModules();

    const [{ placeOrder: restartedPlaceOrder }, { orders: restartedOrders }, { getCheckoutDatabase }] = await Promise.all([
      import('../server/application/checkout/place-order'),
      import('../server/domain/orders'),
      import('../server/infrastructure/checkout-database'),
    ]);
    const replay = await restartedPlaceOrder({
      checkoutRequestId: 'checkout-durable-1',
      cartId: String(cart._id),
      cartOwnerId: 'mock-customer-1',
      user: user!,
      order: orderInput,
    });
    const independentRead = await restartedOrders.findById(first.orderId);
    const independentList = await restartedOrders.list('mock-customer-1');

    expect(replay).toEqual(first);
    expect(independentRead?.order._id).toBe(first.orderId);
    expect(independentRead?.order.products[0]).toMatchObject({
      id: 'prod-1',
      unitPriceAfterDiscounts: 949.99,
      subtotal: 949.99,
    });
    expect(independentRead?.order.subtotal).toBe(949.99);
    expect(independentList.some((order) => order._id === first.orderId)).toBe(true);

    const database = await getCheckoutDatabase();
    const [ordersCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_orders');
    const [paymentsCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_payments');
    const [reservationsCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_reservations');

    expect(Number(ordersCount?.total)).toBe(1);
    expect(Number(paymentsCount?.total)).toBe(1);
    expect(Number(reservationsCount?.total)).toBe(1);
  });

  it('allows only one checkout when different request IDs race on one cart revision', async () => {
    const [{ getMockCartForUser, addProductsToMockCart }, { getMockUserById }, checkoutModule] = await Promise.all([
      import('../server/utils/mockCart'),
      import('../server/utils/mockUsers'),
      import('../server/application/checkout/place-order'),
    ]);
    const user = getMockUserById('mock-customer-1')!;
    const cart = await getMockCartForUser('mock-customer-1');
    await addProductsToMockCart(cart, [{ id: 'prod-1', stock: 1, isFolder: false }]);

    const command = {
      cartId: String(cart._id),
      cartOwnerId: 'mock-customer-1',
      user,
      order: orderInput,
    };
    const results = await Promise.allSettled([
      checkoutModule.placeOrder({ ...command, checkoutRequestId: 'checkout-race-a' }),
      checkoutModule.placeOrder({ ...command, checkoutRequestId: 'checkout-race-b' }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const { getCheckoutDatabase } = await import('../server/infrastructure/checkout-database');
    const database = await getCheckoutDatabase();
    const [ordersCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_orders');
    const [paymentsCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_payments');
    const [reservationsCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_reservations');

    expect(Number(ordersCount?.total)).toBe(2);
    expect(Number(paymentsCount?.total)).toBe(2);
    expect(Number(reservationsCount?.total)).toBe(2);
  });
});
