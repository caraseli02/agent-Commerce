import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readOrderPaymentState } from '~/server/application/checkout/read-order-payment-state';
import { finalizePaidCheckout } from '~/server/application/checkout/finalize-paid-checkout';
import { commitRefundCompensation } from '~/server/application/checkout/commit-refund-compensation';
import { requireRefundCompensationRecovery } from '~/server/application/checkout/require-refund-compensation-recovery';
import { restartCanceledCheckout } from '~/server/application/checkout/restart-canceled-checkout';
import { createResumeOrderPayment } from '~/server/application/checkout/resume-order-payment';
import { createPlaceOrderUseCase } from '~/server/application/checkout/place-order';
import { createStripeIntentAdapter, payments } from '~/server/domain/payments';

const boundary = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
  orderRead: vi.fn(),
  confirm: vi.fn(),
  hold: vi.fn(),
  commit: vi.fn(),
  complete: vi.fn(),
}));
vi.mock('~/server/infrastructure/checkout-database', () => ({
  assertOutsideCheckoutTransaction: () => undefined,
  getCheckoutDatabase: async () => ({ query: boundary.query, execute: boundary.execute }),
  withCheckoutTransaction: async (operation: () => Promise<unknown>) => operation(),
}));
vi.mock('~/server/domain/orders', () => ({
  orders: {
    getCheckoutStatePreparation: boundary.orderRead,
    getPaymentPreparation: boundary.orderRead,
    confirmPayment: boundary.confirm,
    holdPaidForCompensation: boundary.hold,
  },
}));
vi.mock('~/server/domain/inventory', () => ({
  inventory: { commit: boundary.commit, release: boundary.commit, reestablishReservation: boundary.commit },
}));
vi.mock('~/server/domain/cart', () => ({ cart: { completeCheckout: boundary.complete, restartForReview: boundary.complete } }));
vi.mock('~/server/application/checkout/stripe-payment', () => ({ stripePayments: { initiatePayment: vi.fn() } }));

const claim = {
  owner_id: 'owner',
  request_id: 'request',
  cart_id: 'cart',
  cart_revision: 1,
  order_id: 'order',
  reservation_id: 'reservation',
  payment_id: 'payment',
  workflow_status: 'payment_pending',
  paid_recovery_decision: null,
  result_json: null,
};
const payment = {
  id: 'payment',
  order_id: 'order',
  status: 'PENDING',
  amount_minor: 1234,
  currency: 'RON',
  stripe_payment_intent_id: 'pi_test',
  stripe_payment_intent_create_started_at: new Date(),
  cancellation_requested_at: null,
  row_version: '1',
};

describe('Corrupt persisted state never authorizes side effects', () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([
    { workflow_status: 'invented' },
    { workflow_status: null },
    { paid_recovery_decision: 'invented' },
    { paid_recovery_decision: undefined },
    { paid_recovery_decision: 1 },
  ])('rejects corrupt claim %j across checkout consumers', async (corrupt) => {
    boundary.query.mockResolvedValue([{ ...claim, ...corrupt }]);
    const input = { ownerId: 'owner', orderId: 'order' };
    const financialInput = { paymentId: 'payment', orderId: 'order' };
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
    expect(await finalizePaidCheckout(financialInput)).toEqual({ kind: 'retry' });
    expect(await commitRefundCompensation(financialInput)).toEqual({ kind: 'conflict' });
    expect(await requireRefundCompensationRecovery(financialInput)).toEqual({ kind: 'conflict' });
    expect(await restartCanceledCheckout(input)).toEqual({ kind: 'not-canceled' });
    const initiatePayment = vi.fn();
    expect(await createResumeOrderPayment({ initiatePayment })(input)).toEqual({ kind: 'recovery-required' });
    expect(initiatePayment).not.toHaveBeenCalled();
    for (const effect of [boundary.orderRead, boundary.execute, boundary.confirm, boundary.hold, boundary.commit, boundary.complete])
      expect(effect).not.toHaveBeenCalled();
  });
  it('PlaceOrder rejects an invalid decision before payment continuation or cart cleanup', async () => {
    const getSnapshot = vi.fn();
    const getPaymentPreparation = vi.fn();
    const useCase = createPlaceOrderUseCase(
      {
        cart: { getSnapshot, completeCheckout: boundary.complete },
        catalog: { quoteCheckout: vi.fn() },
        inventory: { reserve: vi.fn(), commit: boundary.commit, release: vi.fn() },
        orders: { createPending: vi.fn(), confirmPayment: boundary.confirm, getPaymentPreparation: boundary.orderRead },
        payments: {
          preparePayment: vi.fn(),
          getPaymentPreparation,
          continuePayment: vi.fn(),
          completePayment: vi.fn(),
          failPayment: vi.fn(),
        },
      },
      {
        lookup: vi.fn().mockResolvedValue({ ...claim, paid_recovery_decision: 'corrupt' }),
        lookupSemantic: vi.fn(),
      },
    );
    await expect(
      useCase({ checkoutRequestId: 'request', cartId: 'cart', cartOwnerId: 'owner', user: {} as never, order: {} }),
    ).rejects.toMatchObject({ code: 'payment_recovery_required' });
    for (const effect of [getSnapshot, getPaymentPreparation, boundary.commit, boundary.confirm, boundary.complete])
      expect(effect).not.toHaveBeenCalled();
  });
  it.each(['BROKEN', null, 4, {}])('Stripe refuses corrupt local Payment %j without provider calls', async (status) => {
    boundary.query.mockImplementation(async (sql: string) =>
      sql.includes('checkout_stripe_webhook_events') ? [] : [{ ...payment, status }],
    );
    const provider = { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() };
    const adapter = createStripeIntentAdapter({ provider, enabled: () => true });
    expect(await adapter.initiatePayment({ paymentId: 'payment' })).toEqual({ kind: 'recovery-required' });
    expect(await adapter.cancelPayment({ paymentId: 'payment', reason: 'requested_by_customer' })).toEqual({ kind: 'recovery-required' });
    expect(await adapter.reconcilePayment({ paymentId: 'payment' })).toEqual({ kind: 'recovery-required' });
    expect(
      await adapter.applyVerifiedIntentEvent({ eventId: 'evt_test', eventType: 'payment_intent.succeeded', intentId: 'pi_test' }),
    ).toEqual({ kind: 'recovery-required' });
    for (const effect of [provider.create, provider.retrieve, provider.cancel, boundary.execute]) expect(effect).not.toHaveBeenCalled();
    expect(await payments.getPaymentPreparation('payment')).toMatchObject({ paymentId: 'payment', status: null });
    expect(await payments.continuePayment({ paymentId: 'payment' })).toEqual({ kind: 'recovery-required' });
  });
  it('distinguishes missing Payments from existing corrupt Payments', async () => {
    boundary.execute.mockResolvedValue(0);
    boundary.query.mockResolvedValue([]);
    const adapter = createStripeIntentAdapter({ provider: { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() }, enabled: () => true });
    expect(await adapter.initiatePayment({ paymentId: 'missing' })).toEqual({ kind: 'terminal-failure' });
    expect(await payments.getPaymentPreparation('missing')).toBeNull();
    expect(await payments.completePayment({ paymentId: 'missing', providerReference: null })).toEqual({ kind: 'not-found' });
    boundary.query.mockResolvedValue([{ ...payment, status: 'corrupt' }]);
    expect(await payments.getPaymentPreparation('payment')).toMatchObject({ paymentId: 'payment', status: null });
    expect(await payments.completePayment({ paymentId: 'payment', providerReference: null })).toMatchObject({ kind: 'recovery-required' });
  });
  it.each([{ workflow_status: 'invented' }, { paid_recovery_decision: 'invented' }])(
    'PlaceOrder refuses corruption introduced at the locked reread: %j',
    async (corrupt) => {
      boundary.query.mockResolvedValue([{ ...claim, ...corrupt }]);
      const useCase = createPlaceOrderUseCase(
        {
          cart: { getSnapshot: vi.fn(), completeCheckout: boundary.complete },
          catalog: { quoteCheckout: vi.fn() },
          inventory: { reserve: vi.fn(), commit: boundary.commit, release: vi.fn() },
          orders: { createPending: vi.fn(), confirmPayment: boundary.confirm, getPaymentPreparation: boundary.orderRead },
          payments: {
            preparePayment: vi.fn(),
            getPaymentPreparation: vi.fn().mockResolvedValue({ paymentId: 'payment', orderId: 'order', status: 'PAID' }),
            continuePayment: vi.fn(),
            completePayment: vi.fn(),
            failPayment: vi.fn(),
          },
        },
        { lookup: vi.fn().mockResolvedValue(claim), lookupSemantic: vi.fn() },
      );
      await expect(
        useCase({ checkoutRequestId: 'request', cartId: 'cart', cartOwnerId: 'owner', user: {} as never, order: {} }),
      ).rejects.toMatchObject({ code: 'payment_recovery_required', statusCode: 409 });
      for (const effect of [boundary.commit, boundary.confirm, boundary.complete]) expect(effect).not.toHaveBeenCalled();
      // The recovery write must admit only known workflows and decisions, never normalize corruption.
      const [sql] = boundary.execute.mock.calls[0]!;
      expect(sql).toContain("workflow_status IN ('prepared','payment_pending','recovery_required')");
      expect(sql).toContain("paid_recovery_decision IS NULL OR paid_recovery_decision IN ('ALLOCATE','BACKORDER')");
      // Exercise the emitted predicate in PostgreSQL without weakening application constraints.
      const realDatabase = await vi.importActual<typeof import('~/server/infrastructure/checkout-database')>(
        '~/server/infrastructure/checkout-database',
      );
      await realDatabase.withCheckoutTransaction(async () => {
        const database = await realDatabase.getCheckoutDatabase();
        await database.execute(`CREATE TEMP TABLE corrupt_claim_predicate (
          owner_id TEXT, request_id TEXT, workflow_status TEXT, paid_recovery_decision TEXT, updated_at TEXT
        ) ON COMMIT DROP`);
        const persisted = { ...claim, ...corrupt };
        await database.execute('INSERT INTO corrupt_claim_predicate VALUES ($1,$2,$3,$4,NULL)', [
          claim.owner_id,
          claim.request_id,
          persisted.workflow_status,
          persisted.paid_recovery_decision,
        ]);
        expect(
          await database.execute(sql.replace('checkout_claims', 'pg_temp.corrupt_claim_predicate'), boundary.execute.mock.calls[0]![1]),
        ).toBe(0);
        expect(await database.query('SELECT workflow_status,paid_recovery_decision FROM corrupt_claim_predicate')).toEqual([
          { workflow_status: persisted.workflow_status, paid_recovery_decision: persisted.paid_recovery_decision },
        ]);
      });
    },
  );
});
