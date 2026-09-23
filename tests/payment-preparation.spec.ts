import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

const order = {
  type: 0,
  shippingDetails: {
    address: { name1: 'Payment Boundary 1' },
    billingAddress: { name1: 'Payment Boundary 1' },
  },
  paymentDetails: { type: 0 },
  notes: [],
};

const cleanCheckout = async () => {
  const database = await getCheckoutDatabase();
  await database.execute(
    'TRUNCATE checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
  );
};

const setupCheckout = async (ownerId = 'payment-boundary-customer') => {
  const [
    { getMockCartForUser, addProductsToMockCart },
    { getMockUserById },
    checkout,
    cartDomain,
    catalogModule,
    inventoryModule,
    ordersModule,
    paymentsModule,
  ] = await Promise.all([
    import('../server/utils/mockCart'),
    import('../server/utils/mockUsers'),
    import('../server/application/checkout/place-order'),
    import('../server/domain/cart'),
    import('../server/domain/catalog'),
    import('../server/domain/inventory'),
    import('../server/domain/orders'),
    import('../server/domain/payments'),
  ]);
  const cart = await getMockCartForUser(ownerId);
  await addProductsToMockCart(cart, [{ id: 'prod-1', stock: 1, isFolder: false }]);
  const user = getMockUserById('mock-customer-1')!;
  const command = {
    checkoutRequestId: 'payment-boundary-request',
    cartId: String(cart._id),
    cartOwnerId: ownerId,
    user: { ...user, _id: ownerId, firebaseId: ownerId },
    order,
  };

  return {
    cart,
    command,
    checkout,
    dependencies: {
      cart: cartDomain.cart,
      catalog: catalogModule.catalog,
      inventory: inventoryModule.inventory,
      orders: ordersModule.orders,
      payments: paymentsModule.payments,
    },
  };
};

describe('durable payment preparation boundary', () => {
  beforeEach(cleanCheckout);

  it('commits one pending checkout tuple before a post-commit continuation crash and resumes it without re-quoting', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const crash = new Error('simulated request crash after local preparation');
    const continuePayment = vi.fn(async () => {
      throw crash;
    });
    const quoteCheckout = vi.fn(dependencies.catalog.quoteCheckout);
    const crashingPlaceOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, catalog: { quoteCheckout }, payments: { ...dependencies.payments, continuePayment } },
      checkout.createPlaceOrderCoordinator(),
    );

    await expect(crashingPlaceOrder(command)).rejects.toBe(crash);

    const database = await getCheckoutDatabase();
    const [prepared] = await database.query<{
      order_id: string;
      reservation_id: string;
      payment_id: string;
      workflow_status: string;
      payment_status: string;
      paid_by_payment_id: string | null;
    }>(
      `SELECT claim.order_id, claim.reservation_id, claim.payment_id, claim.workflow_status,
              payment.status AS payment_status, orders.paid_by_payment_id
         FROM checkout_claims AS claim
         JOIN checkout_payments AS payment ON payment.id = claim.payment_id
         JOIN checkout_orders AS orders ON orders.id = claim.order_id
        WHERE claim.owner_id = $1 AND claim.request_id = $2`,
      [command.cartOwnerId, command.checkoutRequestId],
    );

    expect(prepared).toMatchObject({
      workflow_status: 'payment_pending',
      payment_status: 'PENDING',
      paid_by_payment_id: null,
    });
    expect(prepared?.order_id).toBeTruthy();
    expect(prepared?.reservation_id).toBeTruthy();
    expect(prepared?.payment_id).toBeTruthy();
    expect(continuePayment).toHaveBeenCalledWith({ paymentId: prepared?.payment_id });

    const replay = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        catalog: {
          quoteCheckout: vi.fn(async () => {
            throw new Error('A prepared checkout must use its immutable Order amount, not re-quote Catalog.');
          }),
        },
      },
      checkout.createPlaceOrderCoordinator(),
    );
    const result = await replay(command);
    const [completed] = await database.query<{
      order_id: string;
      reservation_id: string;
      payment_id: string;
      workflow_status: string;
      payment_status: string;
      paid_by_payment_id: string | null;
    }>(
      `SELECT claim.order_id, claim.reservation_id, claim.payment_id, claim.workflow_status,
              payment.status AS payment_status, orders.paid_by_payment_id
         FROM checkout_claims AS claim
         JOIN checkout_payments AS payment ON payment.id = claim.payment_id
         JOIN checkout_orders AS orders ON orders.id = claim.order_id
        WHERE claim.owner_id = $1 AND claim.request_id = $2`,
      [command.cartOwnerId, command.checkoutRequestId],
    );

    expect(result.orderId).toBe(prepared?.order_id);
    expect(completed).toMatchObject({
      order_id: prepared?.order_id,
      reservation_id: prepared?.reservation_id,
      payment_id: prepared?.payment_id,
      workflow_status: 'finalized',
      payment_status: 'PAID',
      paid_by_payment_id: prepared?.payment_id,
    });
    expect(quoteCheckout).toHaveBeenCalledTimes(1);
  });

  it('accepts concurrent keys for one cart revision as durable aliases and keeps their input conflict protection after completion', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const create = () => checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator());

    const [first, second] = await Promise.all([
      create()({ ...command, checkoutRequestId: 'payment-alias-a' }),
      create()({ ...command, checkoutRequestId: 'payment-alias-b' }),
    ]);

    expect(first.orderId).toBe(second.orderId);
    const database = await getCheckoutDatabase();
    const aliases = await database.query<{ request_id: string }>(
      'SELECT request_id FROM checkout_claim_aliases WHERE owner_id = $1 ORDER BY request_id',
      [command.cartOwnerId],
    );
    expect(aliases.map((row) => row.request_id)).toEqual(['payment-alias-a', 'payment-alias-b']);

    const replay = await create()({ ...command, checkoutRequestId: 'payment-alias-b' });
    expect(replay.orderId).toBe(first.orderId);
    await expect(
      create()({
        ...command,
        checkoutRequestId: 'payment-alias-b',
        order: { ...order, shippingDetails: { ...order.shippingDetails, deliveryTypeId: 'changed' } },
      }),
    ).rejects.toMatchObject({ code: 'idempotency_conflict', statusCode: 409 });
  });

  it('keeps the original snapshot through a serialization retry when concurrent request keys become one alias tuple', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const getSnapshot = vi.fn(dependencies.cart.getSnapshot);
    let serializationFailure = true;
    let notifyInjected!: () => void;
    const injected = new Promise<void>((resolve) => {
      notifyInjected = resolve;
    });
    let releaseSerializationFailure!: () => void;
    const releaseSerialization = new Promise<void>((resolve) => {
      releaseSerializationFailure = resolve;
    });
    const preparePayment = vi.fn(async (input: Parameters<typeof dependencies.payments.preparePayment>[0]) => {
      if (serializationFailure) {
        serializationFailure = false;
        notifyInjected();
        await releaseSerialization;
        throw Object.assign(new Error('simulated serialization failure'), { code: '40001' });
      }
      return dependencies.payments.preparePayment(input);
    });
    const retrying = checkout.createPlaceOrderUseCase(
      { ...dependencies, cart: { ...dependencies.cart, getSnapshot }, payments: { ...dependencies.payments, preparePayment } },
      checkout.createPlaceOrderCoordinator(),
    );
    const concurrent = checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator());

    const retryingResult = retrying({ ...command, checkoutRequestId: 'payment-retry-alias-a' });
    await injected;
    const concurrentResult = concurrent({ ...command, checkoutRequestId: 'payment-retry-alias-b' });
    releaseSerializationFailure();
    const [first, second] = await Promise.all([retryingResult, concurrentResult]);

    expect(first.orderId).toBe(second.orderId);
    expect(serializationFailure).toBe(false);
    expect(preparePayment).toHaveBeenCalled();
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    const database = await getCheckoutDatabase();
    const claims = await database.query<{ request_id: string; cart_revision: number }>(
      'SELECT request_id, cart_revision FROM checkout_claims WHERE owner_id = $1',
      [command.cartOwnerId],
    );
    const aliases = await database.query<{ request_id: string }>(
      'SELECT request_id FROM checkout_claim_aliases WHERE owner_id = $1 ORDER BY request_id',
      [command.cartOwnerId],
    );
    expect(claims).toHaveLength(1);
    expect(claims[0]?.cart_revision).toBe(2);
    expect(aliases.map((alias) => alias.request_id)).toEqual(['payment-retry-alias-a', 'payment-retry-alias-b']);
  });

  it('creates a fresh tuple from a repopulated cart revision while an old request replays its finalized order', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const quoteCheckout = vi.fn(dependencies.catalog.quoteCheckout);
    const placeOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, catalog: { quoteCheckout } },
      checkout.createPlaceOrderCoordinator(),
    );
    const firstCommand = { ...command, checkoutRequestId: 'payment-readd-first' };
    const first = await placeOrder(firstCommand);
    const { addProductsToMockCart, getMockCartForUser } = await import('../server/utils/mockCart');
    const repopulatedCart = await getMockCartForUser(command.cartOwnerId);
    await addProductsToMockCart(repopulatedCart, [{ id: 'prod-2', stock: 1, isFolder: false }]);

    const second = await placeOrder({ ...command, checkoutRequestId: 'payment-readd-second' });
    const replay = await placeOrder(firstCommand);

    expect(second.orderId).not.toBe(first.orderId);
    expect(replay.orderId).toBe(first.orderId);
    expect(quoteCheckout.mock.calls.map(([input]) => input.items)).toEqual([
      [{ productId: 'prod-1', quantity: 1 }],
      [{ productId: 'prod-2', quantity: 1 }],
    ]);
    const database = await getCheckoutDatabase();
    const claims = await database.query<{ request_id: string; cart_revision: number; order_id: string; payment_id: string }>(
      'SELECT request_id, cart_revision, order_id, payment_id FROM checkout_claims WHERE owner_id = $1 ORDER BY request_id',
      [command.cartOwnerId],
    );
    expect(claims).toHaveLength(2);
    expect(claims[0]?.cart_revision).not.toBe(claims[1]?.cart_revision);
    expect(new Set(claims.map((claim) => claim.order_id)).size).toBe(2);
    expect(new Set(claims.map((claim) => claim.payment_id)).size).toBe(2);
  });

  it('keeps a guest cart incarnation after login merge so a recreated purchase cannot alias its completed order', async () => {
    const ownerId = 'guest-user-session-payment-recreation';
    const { checkout, command, dependencies } = await setupCheckout(ownerId);
    const placeOrder = checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator());
    const firstCommand = { ...command, checkoutRequestId: 'payment-guest-recreation-first' };
    const first = await placeOrder(firstCommand);
    const { addProductsToMockCart, findMockCartById, mergeGuestCartIntoMockCart } = await import('../server/utils/mockCart');

    await mergeGuestCartIntoMockCart('mock-customer-1', 'payment-recreation');
    const retainedGuestCart = await findMockCartById(command.cartId);
    expect(retainedGuestCart?.products).toEqual([]);
    await addProductsToMockCart(retainedGuestCart!, [{ id: 'prod-2', stock: 1, isFolder: false }]);

    const second = await placeOrder({ ...command, checkoutRequestId: 'payment-guest-recreation-second' });
    const replay = await placeOrder(firstCommand);

    expect(second.orderId).not.toBe(first.orderId);
    expect(replay.orderId).toBe(first.orderId);
    const database = await getCheckoutDatabase();
    const claims = await database.query<{ cart_revision: number; order_id: string; payment_id: string }>(
      'SELECT cart_revision, order_id, payment_id FROM checkout_claims WHERE owner_id = $1 ORDER BY cart_revision',
      [ownerId],
    );
    expect(claims).toHaveLength(2);
    expect(claims[1]!.cart_revision).toBeGreaterThan(claims[0]!.cart_revision);
    expect(new Set(claims.map((claim) => claim.order_id)).size).toBe(2);
    expect(new Set(claims.map((claim) => claim.payment_id)).size).toBe(2);
  });

  it('retries local preparation after serialization without retrying payment continuation', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    let serializationFailure = true;
    const preparePayment = vi.fn(async (input: Parameters<typeof dependencies.payments.preparePayment>[0]) => {
      const prepared = await dependencies.payments.preparePayment(input);
      if (serializationFailure) {
        serializationFailure = false;
        throw Object.assign(new Error('simulated serialization failure'), { code: '40001' });
      }
      return prepared;
    });
    const continuePayment = vi.fn(dependencies.payments.continuePayment);
    const placeOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, payments: { ...dependencies.payments, preparePayment, continuePayment } },
      checkout.createPlaceOrderCoordinator(),
    );

    await expect(placeOrder(command)).resolves.toMatchObject({ orderId: expect.any(String) });
    expect(preparePayment).toHaveBeenCalledTimes(2);
    expect(continuePayment).toHaveBeenCalledTimes(1);
  });

  it('rolls back every preparation row after a permanent failure following Payment creation', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const failure = new Error('permanent preparation failure');
    const preparePayment = vi.fn(async (input: Parameters<typeof dependencies.payments.preparePayment>[0]) => {
      await dependencies.payments.preparePayment(input);
      throw failure;
    });
    const continuePayment = vi.fn(dependencies.payments.continuePayment);
    const placeOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, payments: { ...dependencies.payments, preparePayment, continuePayment } },
      checkout.createPlaceOrderCoordinator(),
    );

    await expect(placeOrder(command)).rejects.toBe(failure);
    const database = await getCheckoutDatabase();
    const [counts] = await database.query<{
      aliases: string;
      claims: string;
      orders: string;
      reservations: string;
      payments: string;
    }>(`SELECT
          (SELECT COUNT(*) FROM checkout_claim_aliases) AS aliases,
          (SELECT COUNT(*) FROM checkout_claims) AS claims,
          (SELECT COUNT(*) FROM checkout_orders) AS orders,
          (SELECT COUNT(*) FROM checkout_reservations) AS reservations,
          (SELECT COUNT(*) FROM checkout_payments) AS payments`);
    expect(counts).toEqual({ aliases: '0', claims: '0', orders: '0', reservations: '0', payments: '0' });
    expect(preparePayment).toHaveBeenCalledTimes(1);
    expect(continuePayment).not.toHaveBeenCalled();
  });

  it('persists a failed continuation and rejects replay without re-quoting or continuing again', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const quoteCheckout = vi.fn(dependencies.catalog.quoteCheckout);
    const continuePayment = vi.fn(async () => ({ kind: 'failed' as const, providerReference: 'provider-failure' }));
    const placeOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, catalog: { quoteCheckout }, payments: { ...dependencies.payments, continuePayment } },
      checkout.createPlaceOrderCoordinator(),
    );

    await expect(placeOrder(command)).rejects.toMatchObject({ code: 'payment_failed', statusCode: 409 });
    const database = await getCheckoutDatabase();
    const [failed] = await database.query<{
      order_id: string;
      payment_id: string;
      status: string;
      workflow_status: string;
      provider_reference: string | null;
    }>(
      `SELECT claim.order_id, claim.payment_id, payment.status, claim.workflow_status, payment.provider_reference
         FROM checkout_claims claim JOIN checkout_payments payment ON payment.id = claim.payment_id
        WHERE claim.owner_id = $1 AND claim.request_id = $2`,
      [command.cartOwnerId, command.checkoutRequestId],
    );
    expect(failed).toMatchObject({ status: 'FAILED', workflow_status: 'payment_pending', provider_reference: 'provider-failure' });

    await expect(placeOrder(command)).rejects.toMatchObject({ code: 'payment_failed', statusCode: 409 });
    const [counts] = await database.query<{ orders: string; payments: string }>(
      'SELECT (SELECT COUNT(*) FROM checkout_orders) AS orders, (SELECT COUNT(*) FROM checkout_payments) AS payments',
    );
    const [replayed] = await database.query<{ order_id: string; payment_id: string }>(
      'SELECT order_id, payment_id FROM checkout_claims WHERE owner_id = $1 AND request_id = $2',
      [command.cartOwnerId, command.checkoutRequestId],
    );
    expect(counts).toEqual({ orders: '1', payments: '1' });
    expect(replayed).toEqual({ order_id: failed?.order_id, payment_id: failed?.payment_id });
    expect(quoteCheckout).toHaveBeenCalledTimes(1);
    expect(continuePayment).toHaveBeenCalledTimes(1);
    expect(failed?.order_id).toBeTruthy();
    expect(failed?.payment_id).toBeTruthy();
  });

  it.each([
    ['PROCESSING', 'payment_recovery_required'],
    ['CANCELED', 'payment_failed'],
    ['FAILED', 'payment_failed'],
  ])('does not finalize a replayed %s Payment as paid', async (status, errorCode) => {
    const { checkout, command, dependencies } = await setupCheckout();
    const crash = new Error('stop after Payment preparation');
    const first = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        payments: {
          ...dependencies.payments,
          continuePayment: vi.fn(async () => {
            throw crash;
          }),
        },
      },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(first(command)).rejects.toBe(crash);
    const database = await getCheckoutDatabase();
    const [prepared] = await database.query<{ payment_id: string }>('SELECT payment_id FROM checkout_claims WHERE owner_id = $1', [
      command.cartOwnerId,
    ]);
    await database.execute('UPDATE checkout_payments SET status = $1 WHERE id = $2', [status, prepared!.payment_id]);
    expect(await dependencies.payments.getPaymentPreparation(prepared!.payment_id)).toMatchObject({ status });

    const continuePayment = vi.fn(dependencies.payments.continuePayment);
    const replay = checkout.createPlaceOrderUseCase(
      { ...dependencies, payments: { ...dependencies.payments, continuePayment } },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(replay(command)).rejects.toMatchObject({ code: errorCode, statusCode: 409 });
    expect(continuePayment).not.toHaveBeenCalled();
    const [state] = await database.query<{
      payment_status: string;
      workflow_status: string;
      paid_by_payment_id: string | null;
      reservation_status: string;
    }>(
      `SELECT payment.status AS payment_status, claim.workflow_status, orders.paid_by_payment_id,
              reservation.status AS reservation_status
         FROM checkout_claims claim
         JOIN checkout_payments payment ON payment.id = claim.payment_id
         JOIN checkout_orders orders ON orders.id = claim.order_id
         JOIN checkout_reservations reservation ON reservation.id = claim.reservation_id
        WHERE claim.owner_id = $1`,
      [command.cartOwnerId],
    );
    expect(state).toEqual({
      payment_status: status,
      workflow_status: 'payment_pending',
      paid_by_payment_id: null,
      reservation_status: 'active',
    });
  });

  it.each([
    ['stripe_payment_intent_id', 'pi_existing'],
    ['stripe_payment_intent_create_started_at', '2026-09-22T00:00:00.000Z'],
    ['cancellation_requested_at', '2026-09-22T00:00:00.000Z'],
  ])('refuses mock continuation when a PENDING Payment has %s', async (column, value) => {
    const { checkout, command, dependencies } = await setupCheckout();
    const crash = new Error('stop after Payment preparation');
    const first = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        payments: {
          ...dependencies.payments,
          continuePayment: vi.fn(async () => {
            throw crash;
          }),
        },
      },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(first(command)).rejects.toBe(crash);
    const database = await getCheckoutDatabase();
    const [prepared] = await database.query<{ payment_id: string }>('SELECT payment_id FROM checkout_claims WHERE owner_id = $1', [
      command.cartOwnerId,
    ]);
    await database.execute(`UPDATE checkout_payments SET ${column} = $1 WHERE id = $2`, [value, prepared!.payment_id]);

    const replay = checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator());
    await expect(replay(command)).rejects.toMatchObject({ code: 'payment_recovery_required', statusCode: 409 });
    const [state] = await database.query<{ status: string; workflow_status: string; paid_by_payment_id: string | null }>(
      `SELECT payment.status, claim.workflow_status, orders.paid_by_payment_id
         FROM checkout_claims claim JOIN checkout_payments payment ON payment.id = claim.payment_id
         JOIN checkout_orders orders ON orders.id = claim.order_id WHERE claim.owner_id = $1`,
      [command.cartOwnerId],
    );
    expect(state).toEqual({ status: 'PENDING', workflow_status: 'payment_pending', paid_by_payment_id: null });
  });

  it.each(['succeeded', 'failed'] as const)(
    'does not accept a %s mock outcome when provider creation starts before the conditional Payment update',
    async (outcome) => {
      const { checkout, command, dependencies } = await setupCheckout();
      const database = await getCheckoutDatabase();
      const continuePayment = vi.fn(async ({ paymentId }: { paymentId: string }) => {
        await database.execute('UPDATE checkout_payments SET stripe_payment_intent_create_started_at = NOW() WHERE id = $1', [paymentId]);
        return outcome === 'succeeded'
          ? { kind: 'succeeded' as const, nextAction: { type: 'none' as const }, providerReference: null }
          : { kind: 'failed' as const, providerReference: null };
      });
      const placeOrder = checkout.createPlaceOrderUseCase(
        { ...dependencies, payments: { ...dependencies.payments, continuePayment } },
        checkout.createPlaceOrderCoordinator(),
      );
      await expect(placeOrder(command)).rejects.toMatchObject({ code: 'payment_recovery_required', statusCode: 409 });
      const [state] = await database.query<{ status: string; workflow_status: string; paid_by_payment_id: string | null }>(
        `SELECT payment.status, claim.workflow_status, orders.paid_by_payment_id
           FROM checkout_claims claim JOIN checkout_payments payment ON payment.id = claim.payment_id
           JOIN checkout_orders orders ON orders.id = claim.order_id WHERE claim.owner_id = $1`,
        [command.cartOwnerId],
      );
      expect(state).toEqual({ status: 'PENDING', workflow_status: 'payment_pending', paid_by_payment_id: null });
      expect(continuePayment).toHaveBeenCalledTimes(1);
    },
  );

  it('does not return a paid result from a finalized claim whose Payment no longer reads PAID', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const placeOrder = checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator());
    await expect(placeOrder(command)).resolves.toMatchObject({ orderId: expect.any(String) });
    const database = await getCheckoutDatabase();
    await database.execute(
      `UPDATE checkout_payments SET status = 'PROCESSING'
        WHERE id = (SELECT payment_id FROM checkout_claims WHERE owner_id = $1)`,
      [command.cartOwnerId],
    );

    const replay = checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator());
    await expect(replay(command)).rejects.toMatchObject({ code: 'payment_recovery_required', statusCode: 409 });
    const [claim] = await database.query<{ workflow_status: string; paid_by_payment_id: string }>(
      `SELECT claim.workflow_status, orders.paid_by_payment_id
         FROM checkout_claims claim JOIN checkout_orders orders ON orders.id = claim.order_id
        WHERE claim.owner_id = $1`,
      [command.cartOwnerId],
    );
    expect(claim).toMatchObject({ workflow_status: 'finalized', paid_by_payment_id: expect.any(String) });
  });

  it('rejects an ambient checkout transaction before it writes or continues a payment', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const continuePayment = vi.fn(dependencies.payments.continuePayment);
    const placeOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, payments: { ...dependencies.payments, continuePayment } },
      checkout.createPlaceOrderCoordinator(),
    );

    await expect(withCheckoutTransaction(() => placeOrder(command))).rejects.toThrow(
      'PlaceOrder cannot run inside a checkout transaction.',
    );
    const database = await getCheckoutDatabase();
    const counts = await database.query<{ total: string }>('SELECT COUNT(*) AS total FROM checkout_claims');
    expect(Number(counts[0]?.total)).toBe(0);
    expect(continuePayment).not.toHaveBeenCalled();
  });

  it('keeps the paid tuple recoverable when inventory finalization fails, then finishes it without a second continuation', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const continuePayment = vi.fn(dependencies.payments.continuePayment);
    const failing = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        inventory: { ...dependencies.inventory, commit: vi.fn(async () => ({ kind: 'released' as const })) },
        payments: { ...dependencies.payments, continuePayment },
      },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(failing(command)).rejects.toMatchObject({ code: 'inventory_recovery_required' });
    const database = await getCheckoutDatabase();
    const [beforeRetry] = await database.query<{ payment_id: string; status: string; workflow_status: string }>(
      `SELECT claim.payment_id, payment.status, claim.workflow_status
         FROM checkout_claims claim JOIN checkout_payments payment ON payment.id = claim.payment_id
        WHERE claim.owner_id = $1`,
      [command.cartOwnerId],
    );
    expect(beforeRetry).toMatchObject({ status: 'PAID', workflow_status: 'recovery_required' });
    await expect(checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator())(command)).resolves.toMatchObject({
      orderId: expect.any(String),
    });
    expect(continuePayment).toHaveBeenCalledTimes(1);
  });

  it('replays a finalized order after cleanup loses its response before mutating the cart', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const quoteCheckout = vi.fn(dependencies.catalog.quoteCheckout);
    const continuePayment = vi.fn(dependencies.payments.continuePayment);
    const cleanupLostResponse = vi.fn(async () => {
      throw new Error('simulated lost response before cart cleanup');
    });
    const firstInstance = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        cart: { ...dependencies.cart, completeCheckout: cleanupLostResponse },
        catalog: { quoteCheckout },
        payments: { ...dependencies.payments, continuePayment },
      },
      checkout.createPlaceOrderCoordinator(),
    );

    const firstResult = await firstInstance(command);
    expect(firstResult.orderId).toEqual(expect.any(String));

    const database = await getCheckoutDatabase();
    const [afterLostResponse] = await database.query<{
      workflow_status: string;
      payment_status: string;
      paid_by_payment_id: string | null;
      payload_json: string;
    }>(
      `SELECT claim.workflow_status, payment.status AS payment_status, orders.paid_by_payment_id, cart.payload_json
         FROM checkout_claims AS claim
         JOIN checkout_payments AS payment ON payment.id = claim.payment_id
         JOIN checkout_orders AS orders ON orders.id = claim.order_id
         JOIN checkout_carts AS cart ON cart.cart_id = claim.cart_id
        WHERE claim.owner_id = $1 AND claim.request_id = $2`,
      [command.cartOwnerId, command.checkoutRequestId],
    );
    expect(afterLostResponse).toMatchObject({
      workflow_status: 'finalized',
      payment_status: 'PAID',
      paid_by_payment_id: expect.any(String),
    });
    expect(JSON.parse(afterLostResponse!.payload_json).products).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'prod-1' })]),
    );

    const freshInstance = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        catalog: { quoteCheckout },
        payments: { ...dependencies.payments, continuePayment },
      },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(freshInstance(command)).resolves.toMatchObject({ orderId: firstResult.orderId });
    const [afterReplay] = await database.query<{ payload_json: string }>('SELECT payload_json FROM checkout_carts WHERE cart_id = $1', [
      command.cartId,
    ]);
    expect(JSON.parse(afterReplay!.payload_json).products).toEqual([]);
    expect(quoteCheckout).toHaveBeenCalledTimes(1);
    expect(continuePayment).toHaveBeenCalledTimes(1);
  });

  it('keeps a paid order finalized when cart cleanup rolls back, then a fresh coordinator replay clears the original cart revision', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const cleanupFailure = new Error('simulated cart cleanup rollback');
    const completeCheckout = vi.fn(async (input: Parameters<typeof dependencies.cart.completeCheckout>[0]) => {
      await dependencies.cart.completeCheckout(input);
      throw cleanupFailure;
    });
    const placeOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, cart: { ...dependencies.cart, completeCheckout } },
      checkout.createPlaceOrderCoordinator(),
    );

    await expect(placeOrder(command)).resolves.toMatchObject({ orderId: expect.any(String) });

    const database = await getCheckoutDatabase();
    const [afterFailedCleanup] = await database.query<{
      workflow_status: string;
      payment_status: string;
      paid_by_payment_id: string | null;
      payload_json: string;
    }>(
      `SELECT claim.workflow_status, payment.status AS payment_status, orders.paid_by_payment_id, cart.payload_json
         FROM checkout_claims AS claim
         JOIN checkout_payments AS payment ON payment.id = claim.payment_id
         JOIN checkout_orders AS orders ON orders.id = claim.order_id
         JOIN checkout_carts AS cart ON cart.cart_id = claim.cart_id
        WHERE claim.owner_id = $1 AND claim.request_id = $2`,
      [command.cartOwnerId, command.checkoutRequestId],
    );
    expect(afterFailedCleanup).toMatchObject({
      workflow_status: 'finalized',
      payment_status: 'PAID',
      paid_by_payment_id: expect.any(String),
    });
    expect(JSON.parse(afterFailedCleanup!.payload_json).products).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'prod-1' })]),
    );

    await expect(checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator())(command)).resolves.toMatchObject({
      orderId: expect.any(String),
    });
    const [afterReplay] = await database.query<{ payload_json: string }>('SELECT payload_json FROM checkout_carts WHERE cart_id = $1', [
      command.cartId,
    ]);
    expect(JSON.parse(afterReplay!.payload_json).products).toEqual([]);
  });

  it('retries cart cleanup on a finalized replay without clearing a newly repopulated revision', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const completeCheckout = vi.fn(dependencies.cart.completeCheckout);
    const placeOrder = checkout.createPlaceOrderUseCase(
      { ...dependencies, cart: { ...dependencies.cart, completeCheckout } },
      checkout.createPlaceOrderCoordinator(),
    );

    await placeOrder(command);
    const { addProductsToMockCart, getMockCartForUser } = await import('../server/utils/mockCart');
    await addProductsToMockCart(await getMockCartForUser(command.cartOwnerId), [{ id: 'prod-2', stock: 1, isFolder: false }]);

    await expect(placeOrder(command)).resolves.toMatchObject({ orderId: expect.any(String) });
    const database = await getCheckoutDatabase();
    const [cartRow] = await database.query<{ payload_json: string }>('SELECT payload_json FROM checkout_carts WHERE cart_id = $1', [
      command.cartId,
    ]);
    expect(completeCheckout).toHaveBeenCalledTimes(2);
    expect(JSON.parse(cartRow!.payload_json).products).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'prod-2', stock: 1 })]),
    );
  });

  it('finishes a crashed prepared checkout without clearing cart changes made after its immutable snapshot', async () => {
    const { checkout, cart, command, dependencies } = await setupCheckout();
    const crashing = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        payments: {
          ...dependencies.payments,
          continuePayment: vi.fn(async () => {
            throw new Error('lost response');
          }),
        },
      },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(crashing(command)).rejects.toThrow('lost response');
    const { addProductsToMockCart } = await import('../server/utils/mockCart');
    await addProductsToMockCart(cart, [{ id: 'prod-2', stock: 1, isFolder: false }]);
    const result = await checkout.createPlaceOrderUseCase(dependencies, checkout.createPlaceOrderCoordinator())(command);
    const database = await getCheckoutDatabase();
    const [cartRow] = await database.query<{ payload_json: string; workflow_status: string }>(
      `SELECT cart.payload_json, claim.workflow_status
         FROM checkout_carts AS cart
         JOIN checkout_claims AS claim ON claim.cart_id = cart.cart_id
        WHERE cart.cart_id = $1 AND claim.owner_id = $2`,
      [command.cartId, command.cartOwnerId],
    );
    expect(result.orderId).toBeTruthy();
    expect(cartRow?.workflow_status).toBe('finalized');
    expect(JSON.parse(cartRow!.payload_json).products).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'prod-2', stock: 1 })]),
    );
  });

  it('quarantines an incomplete legacy result without Catalog, continuation, or replacement identities', async () => {
    const { checkout, command, dependencies } = await setupCheckout();
    const crashing = checkout.createPlaceOrderUseCase(
      {
        ...dependencies,
        payments: {
          ...dependencies.payments,
          continuePayment: vi.fn(async () => {
            throw new Error('prepare only');
          }),
        },
      },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(crashing(command)).rejects.toThrow('prepare only');
    const database = await getCheckoutDatabase();
    await database.execute(
      "UPDATE checkout_claims SET workflow_status = 'recovery_required', order_id = NULL, reservation_id = NULL, payment_id = NULL, result_json = $1 WHERE owner_id = $2",
      [JSON.stringify({ orderId: 'legacy-missing-correlation' }), command.cartOwnerId],
    );
    const quoteCheckout = vi.fn(async () => {
      throw new Error('Catalog must not run for a quarantined legacy claim.');
    });
    const continuePayment = vi.fn(async () => {
      throw new Error('Payment continuation must not run for a quarantined legacy claim.');
    });
    const replay = checkout.createPlaceOrderUseCase(
      { ...dependencies, catalog: { quoteCheckout }, payments: { ...dependencies.payments, continuePayment } },
      checkout.createPlaceOrderCoordinator(),
    );
    await expect(replay(command)).rejects.toMatchObject({ code: 'checkout_repair_required', statusCode: 500 });
    const [orders] = await database.query<{ orders: string }>('SELECT COUNT(*) AS orders FROM checkout_orders');
    const [payments] = await database.query<{ payments: string }>('SELECT COUNT(*) AS payments FROM checkout_payments');
    expect(Number(orders?.orders)).toBe(1);
    expect(Number(payments?.payments)).toBe(1);
    expect(quoteCheckout).not.toHaveBeenCalled();
    expect(continuePayment).not.toHaveBeenCalled();
  });

  it('enforces the prepared tuple relationally and never lets JSON override payment identity, status, or money', async () => {
    const first = await setupCheckout('payment-constraints-one');
    const second = await setupCheckout('payment-constraints-two');
    const firstResult = await first.checkout.createPlaceOrderUseCase(
      first.dependencies,
      first.checkout.createPlaceOrderCoordinator(),
    )(first.command);
    const secondResult = await second.checkout.createPlaceOrderUseCase(
      second.dependencies,
      second.checkout.createPlaceOrderCoordinator(),
    )({
      ...second.command,
      checkoutRequestId: 'payment-constraints-second',
    });
    const database = await getCheckoutDatabase();
    const [firstTuple] = await database.query<{ payment_id: string; order_id: string }>(
      'SELECT payment_id, order_id FROM checkout_claims WHERE owner_id = $1',
      [first.command.cartOwnerId],
    );
    const [secondTuple] = await database.query<{ payment_id: string; order_id: string }>(
      'SELECT payment_id, order_id FROM checkout_claims WHERE owner_id = $1',
      [second.command.cartOwnerId],
    );

    await expect(
      database.execute(
        `INSERT INTO checkout_payments (
           id, order_id, payload_json, created_at, status, amount_minor, currency,
           payment_type, use_existing_payment_method, provider_reference, updated_at
         ) VALUES ('foreign-payment', 'missing-order', '{}', '2026-09-01T00:00:00.000Z', 'PENDING', 0, 'RON', NULL, FALSE, NULL, '2026-09-01T00:00:00.000Z')`,
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      database.execute("UPDATE checkout_payments SET status = 'UNKNOWN' WHERE id = $1", [firstTuple!.payment_id]),
    ).rejects.toMatchObject({
      code: '23514',
    });
    await expect(
      database.execute('UPDATE checkout_payments SET amount_minor = -1 WHERE id = $1', [firstTuple!.payment_id]),
    ).rejects.toMatchObject({
      code: '23514',
    });
    await expect(
      database.execute('UPDATE checkout_orders SET paid_by_payment_id = $1 WHERE id = $2', [secondTuple!.payment_id, firstTuple!.order_id]),
    ).rejects.toMatchObject({ code: '23503' });
    await database.execute(
      `INSERT INTO checkout_orders (
         id, customer_id, checkout_request_id, source_cart_id, source_cart_revision,
         fingerprint, payload_json, paid_by_payment_id, created_at, updated_at, grand_total_minor, currency
       ) VALUES (
         'unclaimed-payment-order', 'unclaimed-payment-owner', 'unclaimed-payment-request', 'unclaimed-payment-cart', 1,
         'unclaimed-payment-fingerprint', '{}', NULL, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z', 0, 'RON'
       )`,
    );
    await database.execute(
      `INSERT INTO checkout_payments (
         id, order_id, payload_json, created_at, status, amount_minor, currency,
         payment_type, use_existing_payment_method, provider_reference, updated_at
       ) VALUES (
         'unclaimed-payment', 'unclaimed-payment-order', '{}', '2026-09-01T00:00:00.000Z', 'PENDING', 0, 'RON',
         NULL, FALSE, NULL, '2026-09-01T00:00:00.000Z'
       )`,
    );
    await expect(
      database.execute('UPDATE checkout_claims SET payment_id = $1 WHERE owner_id = $2', ['unclaimed-payment', first.command.cartOwnerId]),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      database.execute(
        `INSERT INTO checkout_claims (
           owner_id, request_id, fingerprint, cart_id, cart_revision, result_json, created_at, updated_at,
           order_id, reservation_id, payment_id, workflow_status
         ) VALUES ($1, 'duplicate-logical-payment', 'same-input', 'a-different-cart', 77, NULL,
                   '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z', $2,
                   (SELECT reservation_id FROM checkout_claims WHERE owner_id = $1), $3, 'payment_pending')`,
        [first.command.cartOwnerId, firstTuple!.order_id, firstTuple!.payment_id],
      ),
    ).rejects.toMatchObject({ code: '23505' });

    await database.execute('UPDATE checkout_payments SET payload_json = $1 WHERE id = $2', [
      JSON.stringify({ paymentId: 'json-payment', status: 'FAILED', amountMinor: 1, currency: 'USD' }),
      firstTuple!.payment_id,
    ]);
    const payment = await first.dependencies.payments.getPaymentPreparation(firstTuple!.payment_id);
    expect(payment).toMatchObject({
      paymentId: firstTuple!.payment_id,
      status: 'PAID',
      amountMinor: expect.any(Number),
      currency: 'RON',
    });
    expect(firstResult.orderId).toBe(firstTuple!.order_id);
    expect(secondResult.orderId).toBe(secondTuple!.order_id);
  });
});
