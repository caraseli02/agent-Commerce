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
    await database.execute(
      'TRUNCATE checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
  });

  it('persists demo history in Orders with canonical customer ownership and reconciled money', async () => {
    const previousMockMode = process.env.NUXT_PUBLIC_MOCK_MODE;
    process.env.NUXT_PUBLIC_MOCK_MODE = 'true';

    try {
      const { orders } = await import('../server/domain/orders');
      const secondCustomerOrders = await orders.list('customer-002');
      const defaultCustomerOrders = await orders.list('mock-customer-1');
      const adminOrders = await orders.list();

      expect(defaultCustomerOrders.some((order) => order.shortId === 'ORD-2024-0001')).toBe(true);
      expect(defaultCustomerOrders.some((order) => order.shortId === 'ORD-2024-0002')).toBe(false);
      expect(secondCustomerOrders.some((order) => order.shortId === 'ORD-2024-0002')).toBe(true);
      expect(adminOrders.some((order) => order.shortId === 'ORD-2024-0001')).toBe(true);
      expect(adminOrders.some((order) => order.shortId === 'ORD-2024-0002')).toBe(true);

      const first = defaultCustomerOrders.find((order) => order.shortId === 'ORD-2024-0001');
      expect(first?.money).toBeDefined();
      if (!first?.money) throw new Error('Expected persisted demo order money');
      expect(first.money.total).toBe(first.money.subtotal + first.money.shippingCost + first.money.vatAmount);
      expect(first?.shippingDetails.stockorderShippingType.price.total).toBe(first?.money.shippingCost);
    } finally {
      if (previousMockMode === undefined) delete process.env.NUXT_PUBLIC_MOCK_MODE;
      else process.env.NUXT_PUBLIC_MOCK_MODE = previousMockMode;
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
    const independentRead = await restartedOrders.findById(first.orderId, 'mock-customer-1');
    const crossCustomerRead = await restartedOrders.findById(first.orderId, 'mock-customer-2');
    const independentList = await restartedOrders.list('mock-customer-1');
    const crossCustomerList = await restartedOrders.list('mock-customer-2');

    expect(replay).toEqual(first);
    expect(restartedReplay).toEqual(first);
    expect(independentRead?.order._id).toBe(first.orderId);
    expect(independentRead?.order.products[0]).toMatchObject({
      id: 'prod-1',
      initialUnitPrice: 999.99,
      unitPriceAfterDiscounts: 949.99,
      discount: expect.objectContaining({ value: 5, total: 50 }),
      subtotal: 949.99,
      vatTotal: 180.5,
    });
    expect(independentRead?.order.subtotal).toBe(949.99);
    expect(independentRead?.order.money).toEqual({
      currency: 'RON',
      subtotal: 949.99,
      discountAmount: 50,
      shippingCost: 19.9,
      smallOrderCharge: 0,
      vatRate: 0.19,
      vatAmount: 180.5,
      total: 1150.39,
    });
    expect(independentRead?.order.total).toBe(1150.39);
    expect(independentList.some((order) => order._id === first.orderId)).toBe(true);
    expect(crossCustomerRead).toBeNull();
    expect(crossCustomerList.some((order) => order._id === first.orderId)).toBe(false);

    const database = await getCheckoutDatabase();
    const [ordersCount] = await database.query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM checkout_orders WHERE checkout_request_id NOT LIKE 'demo-seed:%'",
    );
    const [paymentsCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_payments');
    const [reservationsCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_reservations');

    expect(Number(ordersCount?.total)).toBe(1);
    expect(Number(paymentsCount?.total)).toBe(1);
    expect(Number(reservationsCount?.total)).toBe(1);
  });

  it('rejects checkout when another tab changes the cart after its quote was reviewed', async () => {
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
    const reviewedCartRevision = cart.revision;
    expect(reviewedCartRevision).toBeTruthy();

    let releaseSnapshot!: () => void;
    const snapshotMayRead = new Promise<void>((resolve) => {
      releaseSnapshot = resolve;
    });
    let markSnapshotRequested!: () => void;
    const snapshotRequested = new Promise<void>((resolve) => {
      markSnapshotRequested = resolve;
    });
    const placeOrder = checkoutModule.createPlaceOrderUseCase(
      {
        cart: {
          ...cartDomain.cart,
          getSnapshot: async (input) => {
            markSnapshotRequested();
            await snapshotMayRead;
            return await cartDomain.cart.getSnapshot(input);
          },
        },
        catalog: catalogModule.catalog,
        inventory: inventoryModule.inventory,
        orders: ordersModule.orders,
        payments: paymentsModule.payments,
      },
      checkoutModule.createPlaceOrderCoordinator(),
    );

    const submission = placeOrder({
      checkoutRequestId: 'checkout-stale-review',
      cartId: String(cart._id),
      cartOwnerId: 'mock-customer-1',
      reviewedCartRevision,
      user,
      order: orderInput,
    });
    await snapshotRequested;
    await cartModule.addProductsToMockCart(cart, [{ id: 'prod-2', stock: 1, isFolder: false }]);
    releaseSnapshot();

    await expect(submission).rejects.toMatchObject({ code: 'cart_changed', statusCode: 409 });
    const { getCheckoutDatabase } = await import('../server/infrastructure/checkout-database');
    const database = await getCheckoutDatabase();
    const [orderCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_orders');
    const [reservationCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_reservations');
    const [paymentCount] = await database.query<{ total: number }>('SELECT COUNT(*) AS total FROM checkout_payments');
    expect(Number(orderCount?.total)).toBe(0);
    expect(Number(reservationCount?.total)).toBe(0);
    expect(Number(paymentCount?.total)).toBe(0);
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

  it('converges different request IDs with the same input on one cart revision', async () => {
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

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(0);
    const fulfilled = results.filter(
      (result): result is Extract<(typeof results)[number], { status: 'fulfilled' }> => result.status === 'fulfilled',
    );
    expect(fulfilled[0]?.value.orderId).toBe(fulfilled[1]?.value.orderId);

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

  it('allows only one concurrent checkout when two customers compete for the last stock', async () => {
    const [{ getMockCartForUser, addProductsToMockCart }, { getMockUserById }, { placeOrder }, { getCheckoutDatabase }] = await Promise.all(
      [
        import('../server/utils/mockCart'),
        import('../server/utils/mockUsers'),
        import('../server/application/checkout/place-order'),
        import('../server/infrastructure/checkout-database'),
      ],
    );
    const firstUser = getMockUserById('mock-customer-1')!;
    const secondUser = { ...firstUser, _id: 'stock-race-customer-2', firebaseId: 'stock-race-customer-2' };
    const firstCart = await getMockCartForUser('stock-race-customer-1');
    const secondCart = await getMockCartForUser('stock-race-customer-2');
    await addProductsToMockCart(firstCart, [{ id: 'prod-1', stock: 100, isFolder: false }]);
    await addProductsToMockCart(secondCart, [{ id: 'prod-1', stock: 100, isFolder: false }]);

    const results = await Promise.allSettled([
      placeOrder({
        checkoutRequestId: 'stock-race-request-1',
        cartId: String(firstCart._id),
        cartOwnerId: 'stock-race-customer-1',
        user: { ...firstUser, _id: 'stock-race-customer-1', firebaseId: 'stock-race-customer-1' },
        order: orderInput,
      }),
      placeOrder({
        checkoutRequestId: 'stock-race-request-2',
        cartId: String(secondCart._id),
        cartOwnerId: 'stock-race-customer-2',
        user: secondUser,
        order: orderInput,
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ code: 'inventory_unavailable', statusCode: 409 });

    const database = await getCheckoutDatabase();
    const [counts] = await database.query<{ orders: string; payments: string; paid: string }>(
      `SELECT
        (SELECT COUNT(*) FROM checkout_orders) AS orders,
        (SELECT COUNT(*) FROM checkout_payments) AS payments,
        (SELECT COUNT(*) FROM checkout_payments WHERE status = 'PAID') AS paid`,
    );
    const [inventory] = await database.query<{ on_hand: number; reserved: number }>(
      'SELECT on_hand, reserved FROM checkout_inventory WHERE product_id = $1',
      ['prod-1'],
    );

    expect(counts).toEqual({ orders: '1', payments: '1', paid: '1' });
    expect(inventory).toEqual({ on_hand: 50, reserved: 0 });
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
