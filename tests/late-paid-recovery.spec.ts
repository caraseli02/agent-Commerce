import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recoverLatePaidCheckout } from '~/server/application/checkout/recover-late-paid-checkout';
import { commitRefundCompensation } from '~/server/application/checkout/commit-refund-compensation';
import { finalizePaidCheckout } from '~/server/application/checkout/finalize-paid-checkout';
import { orders } from '~/server/domain/orders';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

const input = { paymentId: 'pay-late', orderId: 'ord-late' };
const timestamp = '2026-10-01T00:00:00.000Z';
const seed = async (suffix = '', choice?: string, quantity = 2, backorderQuantity = 0) => {
  const db = await getCheckoutDatabase();
  const payload = {
    order: {
      _id: `ord-late${suffix}`,
      status: 'Pending',
      paymentDetails: { status: 0 },
      products: [{ id: 'prod-1', stock: quantity, backorder_stock: backorderQuantity, total: 123.4 }],
      shippingDetails: { backorderShippingTypeId: choice },
      money: { total: 123.4 },
      updatedAt: timestamp,
    },
    children: [],
  };
  await db.execute(
    `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
    VALUES ($1,$2,'frozen',$3,'2020-01-01T00:00:00.000Z','expired')`,
    [
      `res-late${suffix}`,
      `owner:request${suffix}`,
      JSON.stringify([{ productId: 'prod-1', immediateQuantity: quantity, backorderQuantity }]),
    ],
  );
  await db.execute(
    `INSERT INTO checkout_orders (id,customer_id,checkout_request_id,source_cart_id,source_cart_revision,
    fingerprint,payload_json,created_at,updated_at,grand_total_minor,currency)
    VALUES ($1,'owner',$2,$3,1,'frozen',$4,$5,$5,12340,'RON')`,
    [`ord-late${suffix}`, `request${suffix}`, `cart${suffix}`, JSON.stringify(payload), timestamp],
  );
  await db.execute(
    `INSERT INTO checkout_payments (id,order_id,payload_json,created_at,status,amount_minor,currency,updated_at)
    VALUES ($1,$2,'{}',$3,'PAID',12340,'RON',$3)`,
    [`pay-late${suffix}`, `ord-late${suffix}`, timestamp],
  );
  await db.execute(
    `INSERT INTO checkout_claims (owner_id,request_id,fingerprint,cart_id,cart_revision,created_at,updated_at,
    order_id,reservation_id,payment_id,workflow_status) VALUES ('owner',$1,'frozen',$2,1,$3,$3,$4,$5,$6,'recovery_required')`,
    [`request${suffix}`, `cart${suffix}`, timestamp, `ord-late${suffix}`, `res-late${suffix}`, `pay-late${suffix}`],
  );
};
const state = async () => {
  const db = await getCheckoutDatabase();
  const [claim] = await db.query('SELECT * FROM checkout_claims WHERE payment_id=$1', [input.paymentId]);
  const [order] = await db.query('SELECT paid_by_payment_id,payload_json FROM checkout_orders WHERE id=$1', [input.orderId]);
  if (!claim || !order) throw new Error('The seeded recovery fixture disappeared.');
  return {
    claim,
    order: { ...order, payload: JSON.parse(String(order.payload_json)) },
    inventory: await db.query('SELECT * FROM checkout_inventory ORDER BY product_id'),
    reservations: await db.query('SELECT * FROM checkout_reservations ORDER BY reservation_key'),
    payments: await db.query('SELECT status FROM checkout_payments ORDER BY id'),
  };
};

describe('atomic approved late-paid recovery policy', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    const db = await getCheckoutDatabase();
    await db.execute(
      'TRUNCATE checkout_stripe_webhook_events,checkout_claim_aliases,checkout_claims,checkout_payments,checkout_orders,checkout_reservations,checkout_inventory,checkout_carts CASCADE',
    );
    await db.execute("INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ('prod-1',5,0)");
    await seed();
  });

  it('allocates every frozen quantity before considering backorder, preserving the accepted snapshot', async () => {
    const before = await state();
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'ALLOCATE' });
    const after = await state();
    expect(after.claim).toMatchObject({ paid_recovery_decision: 'ALLOCATE', workflow_status: 'finalized' });
    expect(after.inventory).toEqual([{ product_id: 'prod-1', on_hand: 3, reserved: 0 }]);
    expect(after.order.payload.order.products).toEqual(before.order.payload.order.products);
    expect(after.order.payload.order.money).toEqual(before.order.payload.order.money);
    expect(after.order.payload.fulfillment.items).toEqual([{ productId: 'prod-1', immediateQuantity: 2, backorderQuantity: 0 }]);
    expect(after.reservations.map((row) => row.status).sort()).toEqual(['committed', 'expired']);
    expect(await commitRefundCompensation(input)).toEqual({ kind: 'conflict' });
  });

  it('allocates frozen backorder quantities when stock has become available', async () => {
    await seed('-back', 'back-001', 1, 2);
    expect(await recoverLatePaidCheckout({ paymentId: 'pay-late-back', orderId: 'ord-late-back' })).toEqual({
      kind: 'decided',
      decision: 'ALLOCATE',
    });
    expect((await state()).inventory).toEqual([{ product_id: 'prod-1', on_hand: 2, reserved: 0 }]);
  });

  it('backorders only the shortage when the frozen buyer choice permits it', async () => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_inventory SET on_hand=1 WHERE product_id='prod-1'");
    await db.execute(
      "UPDATE checkout_orders SET payload_json=jsonb_set(payload_json::jsonb,'{order,shippingDetails,backorderShippingTypeId}','\"back-001\"')::text WHERE id=$1",
      [input.orderId],
    );
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'BACKORDER' });
    const after = await state();
    expect(after.claim).toMatchObject({ paid_recovery_decision: 'BACKORDER', workflow_status: 'finalized' });
    expect(after.inventory).toEqual([{ product_id: 'prod-1', on_hand: 0, reserved: 0 }]);
    expect(after.order.payload.fulfillment.items).toEqual([{ productId: 'prod-1', immediateQuantity: 1, backorderQuantity: 1 }]);
    expect(after.order.payload.order.products[0]).toMatchObject({ stock: 2, backorder_stock: 0 });
    expect(after.payments).toEqual([{ status: 'PAID' }]);
    expect(await commitRefundCompensation(input)).toEqual({ kind: 'conflict' });
  });

  it.each([undefined, 'unknown', ''])('refunds shortage with denied frozen choice %s permanently', async (choice) => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_inventory SET on_hand=1 WHERE product_id='prod-1'");
    if (choice !== undefined)
      await db.execute(
        "UPDATE checkout_orders SET payload_json=jsonb_set(payload_json::jsonb,'{order,shippingDetails,backorderShippingTypeId}',to_jsonb($1::text))::text WHERE id=$2",
        [choice, input.orderId],
      );
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'REFUND' });
    expect((await state()).claim).toMatchObject({ paid_recovery_decision: 'REFUND', workflow_status: 'compensation_pending' });
    expect((await state()).order.payload.order).toMatchObject({ status: 'On Hold', paymentDetails: { status: 1 } });
    await db.execute("UPDATE checkout_inventory SET on_hand=20 WHERE product_id='prod-1'");
    const replenished = await state();
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'REFUND' });
    expect(await finalizePaidCheckout(input)).toEqual({ kind: 'retry' });
    expect(await state()).toEqual(replenished);
  });

  it('respects reservations belonging to other checkouts when computing availability', async () => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_inventory SET reserved=4 WHERE product_id='prod-1'");
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'REFUND' });
    expect((await state()).inventory).toEqual([{ product_id: 'prod-1', on_hand: 5, reserved: 4 }]);
  });

  it('never partially allocates a multi-product Order when one line requires refund', async () => {
    const db = await getCheckoutDatabase();
    const payload = (await state()).order.payload;
    payload.order.products.push({ id: 'prod-2', stock: 2, backorder_stock: 0, total: 0 });
    await db.execute('UPDATE checkout_orders SET payload_json=$1', [JSON.stringify(payload)]);
    await db.execute('UPDATE checkout_reservations SET items_json=$1', [
      JSON.stringify([
        { productId: 'prod-1', immediateQuantity: 2, backorderQuantity: 0 },
        { productId: 'prod-2', immediateQuantity: 2, backorderQuantity: 0 },
      ]),
    ]);
    await db.execute("INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ('prod-2',1,0)");
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'REFUND' });
    expect((await state()).inventory).toEqual([
      { product_id: 'prod-1', on_hand: 5, reserved: 0 },
      { product_id: 'prod-2', on_hand: 1, reserved: 0 },
    ]);
    expect((await state()).reservations).toHaveLength(1);
  });

  it('Inventory refuses backorder for an unsupported product even with buyer permission', async () => {
    const db = await getCheckoutDatabase();
    const payload = (await state()).order.payload;
    payload.order.products[0].id = 'unsupported';
    payload.order.shippingDetails.backorderShippingTypeId = 'back-001';
    await db.execute('UPDATE checkout_orders SET payload_json=$1', [JSON.stringify(payload)]);
    await db.execute('UPDATE checkout_reservations SET items_json=$1', [
      JSON.stringify([{ productId: 'unsupported', immediateQuantity: 2, backorderQuantity: 0 }]),
    ]);
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'REFUND' });
    expect((await state()).order.payload.order.status).toBe('On Hold');
  });

  it('leaves a still-valid reservation to normal finalization', async () => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_reservations SET status='active',expires_at='2100-01-01T00:00:00.000Z'");
    await db.execute('UPDATE checkout_inventory SET reserved=2');
    const before = await state();
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'retry' });
    expect(await state()).toEqual(before);
    expect(await finalizePaidCheckout(input)).toEqual({ kind: 'finalized' });
  });

  it('expires an active elapsed reservation once before making the new allocation', async () => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_reservations SET status='active'");
    await db.execute('UPDATE checkout_inventory SET reserved=2');
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'ALLOCATE' });
    expect((await state()).inventory).toEqual([{ product_id: 'prod-1', on_hand: 3, reserved: 0 }]);
  });

  it('replays a committed choice after a lost response without decrementing stock twice', async () => {
    await recoverLatePaidCheckout(input);
    const committed = await state();
    vi.resetModules();
    const restarted = await import('~/server/application/checkout/recover-late-paid-checkout');
    expect(await restarted.recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'ALLOCATE' });
    expect(await state()).toEqual(committed);
  });

  it('rolls back Inventory, Order and decision on a crash after Order mutation, then retries', async () => {
    const before = await state();
    const normal = orders.confirmPaidRecovery;
    vi.spyOn(orders, 'confirmPaidRecovery').mockImplementationOnce(async (command) => {
      await normal(command);
      throw new Error('crash after Order mutation');
    });
    await expect(recoverLatePaidCheckout(input)).rejects.toThrow('crash after Order mutation');
    expect(await state()).toEqual(before);
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'ALLOCATE' });
  });

  it('rolls back expiry and held Order when a compensation transaction aborts', async () => {
    const db = await getCheckoutDatabase();
    await db.execute('UPDATE checkout_inventory SET on_hand=2,reserved=2');
    await db.execute("UPDATE checkout_reservations SET status='active'");
    // A competing reservation consumes all availability after the old one expires.
    await db.execute('UPDATE checkout_inventory SET on_hand=0,reserved=2');
    const before = await state();
    await expect(
      withCheckoutTransaction(async () => {
        expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'REFUND' });
        throw new Error('abort compensation');
      }),
    ).rejects.toThrow('abort compensation');
    expect(await state()).toEqual(before);
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'decided', decision: 'REFUND' });
  });

  it.each(['ALLOCATE', 'REFUND'] as const)('claim lock fixes the %s outcome before a competing caller can choose', async (first) => {
    let entered!: () => void;
    let release!: () => void;
    const locked = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const winner = withCheckoutTransaction(async () => {
      const db = await getCheckoutDatabase();
      await db.query('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [input.paymentId]);
      const selected = first === 'ALLOCATE' ? await recoverLatePaidCheckout(input) : await commitRefundCompensation(input);
      entered();
      await waiting;
      return selected;
    });
    await locked;
    const competitor = first === 'ALLOCATE' ? commitRefundCompensation(input) : recoverLatePaidCheckout(input);
    release();
    await winner;
    expect(await competitor).toEqual(first === 'ALLOCATE' ? { kind: 'conflict' } : { kind: 'decided', decision: 'REFUND' });
    expect((await state()).claim.paid_recovery_decision).toBe(first);
    expect((await state()).inventory[0]!.on_hand).toBe(first === 'ALLOCATE' ? 3 : 5);
  });

  it('competing paid Orders cannot both spend the last stock', async () => {
    await seed('-other');
    const db = await getCheckoutDatabase();
    await db.execute('UPDATE checkout_inventory SET on_hand=2');
    const results = await Promise.all([
      recoverLatePaidCheckout(input),
      recoverLatePaidCheckout({ paymentId: 'pay-late-other', orderId: 'ord-late-other' }),
    ]);
    expect(results.map((result) => (result.kind === 'decided' ? result.decision : result.kind)).sort()).toEqual(['ALLOCATE', 'REFUND']);
    expect((await state()).inventory).toEqual([{ product_id: 'prod-1', on_hand: 0, reserved: 0 }]);
  });

  it('concurrent duplicate callers converge on one committed plan', async () => {
    expect(await Promise.all([recoverLatePaidCheckout(input), recoverLatePaidCheckout(input)])).toEqual([
      { kind: 'decided', decision: 'ALLOCATE' },
      { kind: 'decided', decision: 'ALLOCATE' },
    ]);
    expect((await state()).reservations).toHaveLength(2);
    expect((await state()).inventory[0]!.on_hand).toBe(3);
  });

  it.each(['payment', 'quantity', 'reservation', 'choice', 'workflow'])('corrupt %s cannot authorize recovery', async (corrupt) => {
    const db = await getCheckoutDatabase();
    if (corrupt === 'payment') await db.execute('UPDATE checkout_payments SET amount_minor=1');
    if (corrupt === 'quantity')
      await db.execute("UPDATE checkout_orders SET payload_json=jsonb_set(payload_json::jsonb,'{order,products,0,stock}','-1')::text");
    if (corrupt === 'reservation') await db.execute("UPDATE checkout_reservations SET items_json='[]'");
    if (corrupt === 'choice') await db.execute("UPDATE checkout_claims SET paid_recovery_decision='REFUND'");
    if (corrupt === 'workflow') await db.execute("UPDATE checkout_claims SET workflow_status='canceled'");
    const before = await state();
    expect(await recoverLatePaidCheckout(input)).toEqual({ kind: 'retry' });
    expect(await state()).toEqual(before);
  });
});
