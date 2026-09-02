import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(async () => {
    const { getCheckoutDatabase } = await import('../server/infrastructure/checkout-database');
    const database = await getCheckoutDatabase();
    for (const table of [
      'checkout_claims',
      'checkout_payments',
      'checkout_orders',
      'checkout_reservations',
      'checkout_inventory',
      'checkout_carts',
    ]) {
      await database.execute(`DELETE FROM ${table}`);
    }
  });

  it('replays, reads, and lists one checkout across independent service instances', async () => {
    const [cartModule, userModule, checkoutModule, cartDomain, catalogModule, inventoryModule, ordersModule, paymentsModule] =
      await Promise.all([
        import('../server/utils/mockCart'),
        import('../server/utils/mockUsers'),
        import('../server/application/checkout/place-order'),
        import('../server/domain/cart'),
        import('../server/domain/catalog'),
        import('../server/domain/inventory'),
        import('../server/domain/orders'),
        import('../server/domain/payments'),
      ]);
    const user = userModule.getMockUserById('mock-customer-1');
    expect(user).toBeDefined();

    const cart = await cartModule.getMockCartForUser('mock-customer-1');
    await cartModule.addProductsToMockCart(cart, [{ id: 'prod-1', stock: 1, isFolder: false }]);
    const dependencies = {
      cart: cartDomain.cart,
      catalog: catalogModule.catalog,
      inventory: inventoryModule.inventory,
      orders: ordersModule.orders,
      payments: paymentsModule.payments,
    };
    const firstInstance = checkoutModule.createPlaceOrderUseCase(dependencies, checkoutModule.createPlaceOrderCoordinator());
    const independentInstance = checkoutModule.createPlaceOrderUseCase(dependencies, checkoutModule.createPlaceOrderCoordinator());

    const first = await firstInstance({
      checkoutRequestId: 'checkout-durable-1',
      cartId: String(cart._id),
      cartOwnerId: 'mock-customer-1',
      user: user!,
      order: orderInput,
    });

    const replay = await independentInstance({
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
    const restartedReplay = await restartedPlaceOrder({
      checkoutRequestId: 'checkout-durable-1',
      cartId: String(cart._id),
      cartOwnerId: 'mock-customer-1',
      user: user!,
      order: orderInput,
    });
    const independentRead = await restartedOrders.findById(first.orderId);
    const independentList = await restartedOrders.list('mock-customer-1');

    expect(replay).toEqual(first);
    expect(restartedReplay).toEqual(first);
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

  it('returns one result when the same checkout request is submitted rapidly by independent instances', async () => {
    const [cartModule, userModule, checkoutModule, cartDomain, catalogModule, inventoryModule, ordersModule, paymentsModule] =
      await Promise.all([
        import('../server/utils/mockCart'),
        import('../server/utils/mockUsers'),
        import('../server/application/checkout/place-order'),
        import('../server/domain/cart'),
        import('../server/domain/catalog'),
        import('../server/domain/inventory'),
        import('../server/domain/orders'),
        import('../server/domain/payments'),
      ]);
    const user = userModule.getMockUserById('mock-customer-1')!;
    const cart = await cartModule.getMockCartForUser('mock-customer-1');
    await cartModule.addProductsToMockCart(cart, [{ id: 'prod-1', stock: 1, isFolder: false }]);
    const dependencies = {
      cart: cartDomain.cart,
      catalog: catalogModule.catalog,
      inventory: inventoryModule.inventory,
      orders: ordersModule.orders,
      payments: paymentsModule.payments,
    };
    const command = {
      checkoutRequestId: 'checkout-rapid-repeat',
      cartId: String(cart._id),
      cartOwnerId: 'mock-customer-1',
      user,
      order: orderInput,
    };

    const [first, replay] = await Promise.all([
      checkoutModule.createPlaceOrderUseCase(dependencies, checkoutModule.createPlaceOrderCoordinator())(command),
      checkoutModule.createPlaceOrderUseCase(dependencies, checkoutModule.createPlaceOrderCoordinator())(command),
    ]);

    expect(replay).toEqual(first);
    const { getCheckoutDatabase } = await import('../server/infrastructure/checkout-database');
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

    expect(Number(ordersCount?.total)).toBe(1);
    expect(Number(paymentsCount?.total)).toBe(1);
    expect(Number(reservationsCount?.total)).toBe(1);
  });

  it('namespaces identical checkout request IDs and reservations by customer', async () => {
    const [{ getMockCartForUser, addProductsToMockCart }, { getMockUserById }, { placeOrder }, { getCheckoutDatabase }] = await Promise.all(
      [
        import('../server/utils/mockCart'),
        import('../server/utils/mockUsers'),
        import('../server/application/checkout/place-order'),
        import('../server/infrastructure/checkout-database'),
      ],
    );
    const firstUser = getMockUserById('mock-customer-1')!;
    const secondUser = { ...firstUser, _id: 'mock-customer-2', firebaseId: 'mock-customer-2' };
    const firstCart = await getMockCartForUser('mock-customer-1');
    const secondCart = await getMockCartForUser('mock-customer-2');
    await addProductsToMockCart(firstCart, [{ id: 'prod-1', stock: 1, isFolder: false }]);
    await addProductsToMockCart(secondCart, [{ id: 'prod-1', stock: 1, isFolder: false }]);

    const [first, second] = await Promise.all([
      placeOrder({
        checkoutRequestId: 'shared-request-id',
        cartId: String(firstCart._id),
        cartOwnerId: 'mock-customer-1',
        user: firstUser,
        order: orderInput,
      }),
      placeOrder({
        checkoutRequestId: 'shared-request-id',
        cartId: String(secondCart._id),
        cartOwnerId: 'mock-customer-2',
        user: secondUser,
        order: orderInput,
      }),
    ]);

    expect(first.orderId).not.toBe(second.orderId);
    const database = await getCheckoutDatabase();
    const reservations = await database.query<{ reservation_key: string }>(
      'SELECT reservation_key FROM checkout_reservations ORDER BY reservation_key',
    );
    expect(reservations.map((row) => row.reservation_key)).toEqual([
      'mock-customer-1:shared-request-id',
      'mock-customer-2:shared-request-id',
    ]);
  });

  it('keeps a guest quote and persisted snapshot on the zero-discount guest policy', async () => {
    const [cartModule, userModule, checkoutModule, ordersModule] = await Promise.all([
      import('../server/utils/mockCart'),
      import('../server/utils/mockUsers'),
      import('../server/application/checkout/place-order'),
      import('../server/domain/orders'),
    ]);
    const ownerId = 'guest-user-session-pricing';
    const user = userModule.createMockGuestCheckoutUser(ownerId);
    const cart = await cartModule.getMockCartForUser(ownerId);
    await cartModule.addProductsToMockCart(cart, [{ id: 'prod-1', stock: 1, isFolder: false }]);

    const result = await checkoutModule.placeOrder({
      checkoutRequestId: 'guest-pricing-request',
      cartId: String(cart._id),
      cartOwnerId: ownerId,
      user,
      order: orderInput,
    });
    const persisted = await ordersModule.orders.findById(result.orderId);

    expect(user.adminSettings?.discount?.value).toBe(0);
    expect(persisted?.order.subtotal).toBe(999.99);
  });
});
