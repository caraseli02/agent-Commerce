import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStripeIntentAdapter } from '~/server/domain/payments';
import type { StripeIntentProvider, StripePaymentIntent } from '~/server/domain/payments/stripe-intents';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

const paymentId = 'pay-stripe-adapter';
const orderId = 'ord-stripe-adapter';
const now = new Date('2026-09-24T12:00:00.000Z');

const seedPayment = async (status = 'PENDING') => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_orders
       (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint,
        payload_json, created_at, updated_at, grand_total_minor, currency)
     VALUES ($1, 'owner-stripe', 'request-stripe', 'cart-stripe', 1, 'fingerprint-stripe', '{}', $2, $2, 1234, 'RON')`,
    [orderId, now.toISOString()],
  );
  await database.execute(
    `INSERT INTO checkout_payments
       (id, order_id, payload_json, created_at, status, amount_minor, currency, updated_at)
     VALUES ($1, $2, '{}', $3, $4, 1234, 'RON', $3)`,
    [paymentId, orderId, now.toISOString(), status],
  );
  await database.execute(
    `INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status)
     VALUES ('res-stripe', 'owner-stripe:request-stripe', 'fingerprint-stripe', '[]', $1, 'active')`,
    [new Date(now.getTime() + 60_000).toISOString()],
  );
  await database.execute(
    `INSERT INTO checkout_claims
       (owner_id, request_id, fingerprint, cart_id, cart_revision, created_at, updated_at,
        order_id, reservation_id, payment_id, workflow_status)
     VALUES ('owner-stripe', 'request-stripe', 'fingerprint-stripe', 'cart-stripe', 1, $1, $1,
       $2, 'res-stripe', $3, 'payment_pending')`,
    [now.toISOString(), orderId, paymentId],
  );
};

const makeIntent = (status: StripePaymentIntent['status'] = 'requires_payment_method'): StripePaymentIntent => ({
  id: 'pi_stripe_adapter',
  amountMinor: 1234,
  currency: 'RON',
  status,
  clientSecret: 'pi_stripe_adapter_secret_test',
  metadata: { paymentId, orderId },
});

const fakeProvider = () => {
  const intents = new Map<string, StripePaymentIntent>();
  const create = vi.fn(async (_input: Parameters<StripeIntentProvider['create']>[0], key: string) => {
    const existing = intents.get(key);
    if (existing) return existing;
    const intent = makeIntent();
    intents.set(key, intent);
    return intent;
  });
  const retrieve = vi.fn(async (id: string) => {
    const intent = [...intents.values()].find((item) => item.id === id);
    if (!intent) throw new Error('Unknown test intent');
    return intent;
  });
  const cancel = vi.fn(async (id: string) => {
    const intent = await retrieve(id);
    const canceled = { ...intent, status: 'canceled' as const };
    for (const [key, value] of intents) if (value.id === id) intents.set(key, canceled);
    return canceled;
  });
  return { provider: { create, retrieve, cancel }, intents, create, retrieve, cancel };
};

const paymentState = async () => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<{
    status: string;
    stripe_payment_intent_id: string | null;
    stripe_payment_intent_create_started_at: Date | null;
    cancellation_requested_at: Date | null;
  }>(
    'SELECT status, stripe_payment_intent_id, stripe_payment_intent_create_started_at, cancellation_requested_at FROM checkout_payments WHERE id=$1',
    [paymentId],
  );
  return row;
};

describe('Stripe PaymentIntent adapter', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations CASCADE',
    );
    await seedPayment();
  });

  it('leaves provider creation disabled by default', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, now: () => now });
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect(fake.create).not.toHaveBeenCalled();
    expect((await paymentState())?.stripe_payment_intent_create_started_at).toBeNull();
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);
    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect(fake.retrieve).not.toHaveBeenCalled();
  });

  it('creates one intent from durable money and leaves local Payment pending', async () => {
    const fake = fakeProvider();
    fake.create.mockImplementationOnce(async (_input, key) => {
      expect((await paymentState())?.stripe_payment_intent_create_started_at).not.toBeNull();
      const intent = makeIntent();
      fake.intents.set(key, intent);
      return intent;
    });
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    expect(await adapter.initiatePayment({ paymentId })).toEqual({
      kind: 'requires-action',
      nextAction: { type: 'client-secret', clientSecret: 'pi_stripe_adapter_secret_test' },
    });
    expect(fake.create).toHaveBeenCalledWith({ paymentId, orderId, amountMinor: 1234, currency: 'RON' }, `payment:${paymentId}:intent`);
    expect(await paymentState()).toMatchObject({ status: 'PENDING', stripe_payment_intent_id: 'pi_stripe_adapter' });
  });

  it('recovers a lost response with the same key, then stops automatic create after 24 hours', async () => {
    const fake = fakeProvider();
    fake.create.mockImplementationOnce(async (_input, key) => {
      fake.intents.set(key, makeIntent());
      throw new Error('response lost');
    });
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect((await paymentState())?.stripe_payment_intent_id).toBeNull();
    expect(await adapter.initiatePayment({ paymentId })).toMatchObject({ kind: 'requires-action' });
    expect(fake.create.mock.calls.map((call) => call[1])).toEqual([`payment:${paymentId}:intent`, `payment:${paymentId}:intent`]);

    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=NULL WHERE id=$1', [paymentId]);
    const { markPaymentClaimRecoveryRequired } = await import('~/server/application/checkout/payment-recovery');
    const expired = createStripeIntentAdapter({
      provider: fake.provider,
      enabled: () => true,
      now: () => new Date(now.getTime() + 86_400_000),
      onRecoveryRequired: markPaymentClaimRecoveryRequired,
    });
    expect(await expired.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect(fake.create).toHaveBeenCalledTimes(2);
    const [claim] = await database.query<{ workflow_status: string }>('SELECT workflow_status FROM checkout_claims WHERE payment_id=$1', [
      paymentId,
    ]);
    expect(claim?.workflow_status).toBe('recovery_required');
  });

  it('retrieves a known intent and never creates a replacement', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    expect(await adapter.initiatePayment({ paymentId })).toMatchObject({ kind: 'requires-action' });
    expect(await adapter.initiatePayment({ paymentId })).toMatchObject({ kind: 'requires-action' });
    expect(fake.create).toHaveBeenCalledTimes(1);
    expect(fake.retrieve).toHaveBeenCalledWith('pi_stripe_adapter');
  });

  it('reconciles a known successful intent into durable paid truth with one provider read', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);
    const fake = fakeProvider();
    fake.intents.set(`payment:${paymentId}:intent`, makeIntent('succeeded'));
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });

    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'paid' });
    expect((await paymentState())?.status).toBe('PAID');
    expect(fake.retrieve).toHaveBeenCalledExactlyOnceWith('pi_stripe_adapter');
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.cancel).not.toHaveBeenCalled();
  });

  it('returns terminal local truth without asking Stripe or reopening legacy failure', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    const database = await getCheckoutDatabase();
    for (const [status, kind] of [
      ['PAID', 'paid'],
      ['CANCELED', 'canceled'],
      ['FAILED', 'terminal-failure'],
    ] as const) {
      await database.execute('UPDATE checkout_payments SET status=$1 WHERE id=$2', [status, paymentId]);
      expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind });
      expect((await paymentState())?.status).toBe(status);
    }
    expect(fake.retrieve).not.toHaveBeenCalled();
    expect(fake.create).not.toHaveBeenCalled();
  });

  it('maps current provider processing and recoverable card states to local nonterminal truth', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    for (const [providerStatus, localStatus, kind] of [
      ['processing', 'PROCESSING', 'processing'],
      ['requires_payment_method', 'PENDING', 'pending'],
      ['requires_confirmation', 'PENDING', 'pending'],
      ['requires_action', 'PENDING', 'pending'],
    ] as const) {
      fake.retrieve.mockResolvedValueOnce(makeIntent(providerStatus));
      expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind });
      expect((await paymentState())?.status).toBe(localStatus);
    }
    expect(fake.retrieve).toHaveBeenCalledTimes(4);
    expect(fake.create).not.toHaveBeenCalled();
  });

  it('does not invent or trust an unknown, mismatched, unavailable, or unsupported intent', async () => {
    const database = await getCheckoutDatabase();
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });

    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect(fake.retrieve).not.toHaveBeenCalled();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);

    fake.retrieve.mockResolvedValueOnce({ ...makeIntent('succeeded'), id: 'pi_other' });
    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    fake.retrieve.mockRejectedValueOnce(new Error('Stripe timeout'));
    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    fake.retrieve.mockResolvedValueOnce(makeIntent('requires_capture'));
    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect((await paymentState())?.status).toBe('PENDING');
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.cancel).not.toHaveBeenCalled();
  });

  it('does not overwrite a newer processing transition with a delayed pending response', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);
    const fake = fakeProvider();
    let entered!: () => void;
    let release!: () => void;
    const providerEntered = new Promise<void>((resolve) => (entered = resolve));
    const providerReleased = new Promise<void>((resolve) => (release = resolve));
    fake.retrieve.mockImplementationOnce(async () => {
      entered();
      await providerReleased;
      return makeIntent('requires_payment_method');
    });
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });

    const reconciliation = adapter.reconcilePayment({ paymentId });
    await providerEntered;
    await database.execute("UPDATE checkout_payments SET status='PROCESSING' WHERE id=$1", [paymentId]);
    release();
    expect(await reconciliation).toEqual({ kind: 'processing' });
    expect((await paymentState())?.status).toBe('PROCESSING');
    expect(fake.retrieve).toHaveBeenCalledTimes(1);
  });

  it('records provider cancellation without replacing the old intent', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);
    const fake = fakeProvider();
    fake.retrieve.mockResolvedValueOnce(makeIntent('canceled'));
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });

    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'canceled' });
    expect((await paymentState())?.status).toBe('CANCELED');
    expect((await paymentState())?.stripe_payment_intent_id).toBe('pi_stripe_adapter');
    expect(fake.create).not.toHaveBeenCalled();
    expect(await adapter.reconcilePayment({ paymentId })).toEqual({ kind: 'canceled' });
    expect(fake.retrieve).toHaveBeenCalledTimes(1);
  });

  it('returns concurrent paid truth instead of a delayed provider failure', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);
    const fake = fakeProvider();
    let entered!: () => void;
    let release!: () => void;
    const providerEntered = new Promise<void>((resolve) => (entered = resolve));
    const providerReleased = new Promise<void>((resolve) => (release = resolve));
    fake.retrieve.mockImplementationOnce(async () => {
      entered();
      await providerReleased;
      return makeIntent('requires_payment_method');
    });
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });

    const reconciliation = adapter.reconcilePayment({ paymentId });
    await providerEntered;
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    release();
    expect(await reconciliation).toEqual({ kind: 'paid' });
    expect((await paymentState())?.status).toBe('PAID');
  });

  it('rejects reconciliation inside a checkout transaction before provider I/O', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_id=$1 WHERE id=$2', ['pi_stripe_adapter', paymentId]);
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    await expect(withCheckoutTransaction(() => adapter.reconcilePayment({ paymentId }))).rejects.toThrow(
      'cannot run inside a checkout transaction',
    );
    expect(fake.retrieve).not.toHaveBeenCalled();
    expect((await paymentState())?.status).toBe('PENDING');
  });

  it('shares one durable intent across two independent initiators', async () => {
    const fake = fakeProvider();
    const first = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    const second = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    const outcomes = await Promise.all([first.initiatePayment({ paymentId }), second.initiatePayment({ paymentId })]);
    expect(outcomes).toEqual([
      { kind: 'requires-action', nextAction: { type: 'client-secret', clientSecret: 'pi_stripe_adapter_secret_test' } },
      { kind: 'requires-action', nextAction: { type: 'client-secret', clientSecret: 'pi_stripe_adapter_secret_test' } },
    ]);
    expect(new Set(fake.create.mock.calls.map((call) => call[1]))).toEqual(new Set([`payment:${paymentId}:intent`]));
    expect(fake.intents.size).toBe(1);
    expect((await paymentState())?.stripe_payment_intent_id).toBe('pi_stripe_adapter');
  });

  it('recovers after Stripe reports an overlapping same-key create as in progress', async () => {
    const fake = fakeProvider();
    let entered!: () => void;
    let release!: () => void;
    const firstAtProvider = new Promise<void>((resolve) => (entered = resolve));
    const firstCanReturn = new Promise<void>((resolve) => (release = resolve));
    fake.create.mockImplementationOnce(async (_input, key) => {
      entered();
      await firstCanReturn;
      const intent = makeIntent();
      fake.intents.set(key, intent);
      return intent;
    });
    fake.create.mockRejectedValueOnce(new Error('idempotency key is already in use'));
    const first = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    const second = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    const firstResult = first.initiatePayment({ paymentId });
    await firstAtProvider;
    expect(await second.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    release();
    expect(await firstResult).toMatchObject({ kind: 'requires-action' });
    expect(await second.initiatePayment({ paymentId })).toMatchObject({ kind: 'requires-action' });
    expect(fake.create).toHaveBeenCalledTimes(2);
    expect((await paymentState())?.stripe_payment_intent_id).toBe('pi_stripe_adapter');
  });

  it('cancels locally only when provider creation never started', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    expect(await adapter.cancelPayment({ paymentId, reason: 'abandoned' })).toEqual({ kind: 'canceled' });
    expect(await paymentState()).toMatchObject({ status: 'CANCELED', stripe_payment_intent_create_started_at: null });
    expect(fake.create).not.toHaveBeenCalled();
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'terminal-failure' });
  });

  it('recovers and cancels the same intent after its create response was lost', async () => {
    const fake = fakeProvider();
    fake.create.mockImplementationOnce(async (_input, key) => {
      fake.intents.set(key, makeIntent());
      throw new Error('response lost');
    });
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect(await adapter.cancelPayment({ paymentId, reason: 'requested_by_customer' })).toEqual({ kind: 'canceled' });
    expect(await paymentState()).toMatchObject({
      status: 'CANCELED',
      stripe_payment_intent_id: 'pi_stripe_adapter',
    });
    expect(fake.create.mock.calls.map((call) => call[1])).toEqual([`payment:${paymentId}:intent`, `payment:${paymentId}:intent`]);
    expect(fake.cancel).toHaveBeenCalledWith('pi_stripe_adapter', 'requested_by_customer');
  });

  it('withholds the client secret when cancellation commits during provider creation', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    fake.create.mockImplementationOnce(async (_input, key) => {
      const intent = makeIntent();
      fake.intents.set(key, intent);
      expect(await adapter.cancelPayment({ paymentId, reason: 'abandoned' })).toEqual({ kind: 'canceled' });
      return intent;
    });
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect((await paymentState())?.status).toBe('CANCELED');
  });

  it('preserves provider success when cancellation races after client-secret release', async () => {
    const fake = fakeProvider();
    const { markPaymentClaimRecoveryRequired } = await import('~/server/application/checkout/payment-recovery');
    const adapter = createStripeIntentAdapter({
      provider: fake.provider,
      enabled: () => true,
      now: () => now,
      onRecoveryRequired: markPaymentClaimRecoveryRequired,
    });
    expect(await adapter.initiatePayment({ paymentId })).toMatchObject({ kind: 'requires-action' });
    fake.intents.set(`payment:${paymentId}:intent`, makeIntent('succeeded'));
    expect(await adapter.cancelPayment({ paymentId, reason: 'abandoned' })).toEqual({ kind: 'paid' });
    expect((await paymentState())?.status).toBe('PAID');
    expect(fake.cancel).not.toHaveBeenCalled();
    const database = await getCheckoutDatabase();
    const [claim] = await database.query<{ workflow_status: string }>('SELECT workflow_status FROM checkout_claims WHERE payment_id=$1', [
      paymentId,
    ]);
    expect(claim?.workflow_status).toBe('recovery_required');
  });

  it('preserves success that arrives while the provider cancellation request is in flight', async () => {
    const fake = fakeProvider();
    const { markPaymentClaimRecoveryRequired } = await import('~/server/application/checkout/payment-recovery');
    const adapter = createStripeIntentAdapter({
      provider: fake.provider,
      enabled: () => true,
      now: () => now,
      onRecoveryRequired: markPaymentClaimRecoveryRequired,
    });
    expect(await adapter.initiatePayment({ paymentId })).toMatchObject({ kind: 'requires-action' });
    fake.cancel.mockImplementationOnce(async () => {
      fake.intents.set(`payment:${paymentId}:intent`, makeIntent('succeeded'));
      throw new Error('cancellation lost the confirmation race');
    });
    expect(await adapter.cancelPayment({ paymentId, reason: 'abandoned' })).toEqual({ kind: 'paid' });
    expect((await paymentState())?.status).toBe('PAID');
    const database = await getCheckoutDatabase();
    const [claim] = await database.query<{ workflow_status: string }>('SELECT workflow_status FROM checkout_claims WHERE payment_id=$1', [
      paymentId,
    ]);
    expect(claim?.workflow_status).toBe('recovery_required');
  });

  it('keeps an expired unknown create pending during cancellation and never calls Stripe create', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET stripe_payment_intent_create_started_at=$1 WHERE id=$2', [
      now.toISOString(),
      paymentId,
    ]);
    const fake = fakeProvider();
    const { markPaymentClaimRecoveryRequired } = await import('~/server/application/checkout/payment-recovery');
    const adapter = createStripeIntentAdapter({
      provider: fake.provider,
      enabled: () => true,
      now: () => new Date(now.getTime() + 86_400_000),
      onRecoveryRequired: markPaymentClaimRecoveryRequired,
    });
    expect(await adapter.cancelPayment({ paymentId, reason: 'abandoned' })).toEqual({ kind: 'recovery-required' });
    expect(fake.create).not.toHaveBeenCalled();
    expect(await paymentState()).toMatchObject({ status: 'PENDING', stripe_payment_intent_id: null });
    expect((await paymentState())?.cancellation_requested_at).not.toBeNull();
    const [claim] = await database.query<{ workflow_status: string }>('SELECT workflow_status FROM checkout_claims WHERE payment_id=$1', [
      paymentId,
    ]);
    expect(claim?.workflow_status).toBe('recovery_required');
  });

  it('does not release a secret for mismatched provider money or a terminal local Payment', async () => {
    const fake = fakeProvider();
    fake.create.mockResolvedValueOnce({ ...makeIntent(), amountMinor: 1235 });
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect((await paymentState())?.stripe_payment_intent_id).toBeNull();
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'succeeded' });
    expect(await adapter.cancelPayment({ paymentId, reason: 'abandoned' })).toEqual({ kind: 'paid' });
    expect((await paymentState())?.status).toBe('PAID');
  });

  it('does not return a client secret for an already succeeded provider intent before local reconciliation', async () => {
    const fake = fakeProvider();
    fake.create.mockResolvedValueOnce(makeIntent('succeeded'));
    const { markPaymentClaimRecoveryRequired } = await import('~/server/application/checkout/payment-recovery');
    const adapter = createStripeIntentAdapter({
      provider: fake.provider,
      enabled: () => true,
      now: () => now,
      onRecoveryRequired: markPaymentClaimRecoveryRequired,
    });
    expect(await adapter.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
    expect((await paymentState())?.status).toBe('PENDING');
    const database = await getCheckoutDatabase();
    const [claim] = await database.query<{ workflow_status: string }>('SELECT workflow_status FROM checkout_claims WHERE payment_id=$1', [
      paymentId,
    ]);
    expect(claim?.workflow_status).toBe('recovery_required');
  });

  it('does not let competing provider identities overwrite the first persisted intent', async () => {
    const first = fakeProvider();
    const second = fakeProvider();
    let arrivals = 0;
    let release!: () => void;
    const bothAtProvider = new Promise<void>((resolve) => (release = resolve));
    first.create.mockImplementationOnce(async () => {
      if (++arrivals === 2) release();
      await bothAtProvider;
      return makeIntent();
    });
    second.create.mockImplementationOnce(async () => {
      if (++arrivals === 2) release();
      await bothAtProvider;
      return { ...makeIntent(), id: 'pi_conflicting', clientSecret: 'pi_conflicting_secret' };
    });
    const adapterOne = createStripeIntentAdapter({ provider: first.provider, enabled: () => true, now: () => now });
    const adapterTwo = createStripeIntentAdapter({ provider: second.provider, enabled: () => true, now: () => now });
    const outcomes = await Promise.all([adapterOne.initiatePayment({ paymentId }), adapterTwo.initiatePayment({ paymentId })]);
    expect(outcomes.map((result) => result.kind).sort()).toEqual(['recovery-required', 'requires-action']);
    expect(['pi_stripe_adapter', 'pi_conflicting']).toContain((await paymentState())?.stripe_payment_intent_id);
  });

  it('rejects provider I/O inside a retryable checkout transaction', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true, now: () => now });
    await expect(withCheckoutTransaction(() => adapter.initiatePayment({ paymentId }))).rejects.toThrow(
      'cannot run inside a checkout transaction',
    );
    expect(fake.create).not.toHaveBeenCalled();
    expect((await paymentState())?.stripe_payment_intent_create_started_at).toBeNull();
  });

  it('keeps the production adapter off without the explicit activation gate', async () => {
    const previousProvider = process.env.PAYMENTS_PROVIDER;
    const previousApproval = process.env.STRIPE_GATE_A_APPROVED;
    try {
      delete process.env.PAYMENTS_PROVIDER;
      delete process.env.STRIPE_GATE_A_APPROVED;
      const { stripePayments } = await import('~/server/application/checkout/stripe-payment');
      expect(await stripePayments.initiatePayment({ paymentId })).toEqual({ kind: 'recovery-required' });
      expect((await paymentState())?.stripe_payment_intent_create_started_at).toBeNull();
    } finally {
      if (previousProvider === undefined) delete process.env.PAYMENTS_PROVIDER;
      else process.env.PAYMENTS_PROVIDER = previousProvider;
      if (previousApproval === undefined) delete process.env.STRIPE_GATE_A_APPROVED;
      else process.env.STRIPE_GATE_A_APPROVED = previousApproval;
    }
  });
});
