import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStripeIntentProvider, createStripeRefundProvider } from '~~/server/domain/payments/stripe-provider';
const sdk = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn() }));
const intents = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('stripe', () => ({
  default: class {
    refunds = sdk;
    paymentIntents = intents;
  },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
const response = {
  id: 're_test',
  payment_intent: 'pi_test',
  amount: 1234,
  currency: 'ron',
  status: 'pending',
  metadata: { refundId: 'refund-local', paymentId: 'pay-local', orderId: 'ord-local' },
};
describe('Stripe Refund SDK boundary', () => {
  it.each(['preview', 'production'])('tags new PaymentIntents for the %s database', async (environment) => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('VERCEL_ENV', environment);
    intents.create.mockResolvedValue({
      id: 'pi_test',
      amount: 1234,
      currency: 'ron',
      status: 'requires_payment_method',
      metadata: response.metadata,
    });
    await createStripeIntentProvider().create(
      { paymentId: 'pay-local', orderId: 'ord-local', amountMinor: 1234, currency: 'RON' },
      'payment:pay-local',
    );
    expect(intents.create).toHaveBeenCalledWith(
      {
        amount: 1234,
        currency: 'ron',
        allowed_payment_method_types: ['card'],
        metadata: { paymentId: 'pay-local', orderId: 'ord-local', agentCommerceEnvironment: environment },
      },
      { idempotencyKey: 'payment:pay-local' },
    );
  });
  it('sends persisted full amount/reason/metadata with bounded same-key request options', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
    sdk.create.mockResolvedValue(response);
    const result = await createStripeRefundProvider().create(
      {
        refundId: 'refund-local',
        paymentId: 'pay-local',
        orderId: 'ord-local',
        paymentIntentId: 'pi_test',
        amountMinor: 1234,
        reason: 'requested_by_customer',
      },
      'refund:refund-local:full',
    );
    expect(sdk.create).toHaveBeenCalledExactlyOnceWith(
      {
        payment_intent: 'pi_test',
        amount: 1234,
        reason: 'requested_by_customer',
        metadata: { ...response.metadata, agentCommerceEnvironment: 'development' },
      },
      { idempotencyKey: 'refund:refund-local:full', timeout: 10000, maxNetworkRetries: 0 },
    );
    expect(result).toEqual({
      id: 're_test',
      paymentIntentId: 'pi_test',
      amountMinor: 1234,
      currency: 'ron',
      status: 'pending',
      metadata: response.metadata,
    });
  });
  it('reads only the exact known Refund with bounded options', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_fixture');
    sdk.retrieve.mockResolvedValue({ ...response, payment_intent: { id: 'pi_test' } });
    expect((await createStripeRefundProvider().retrieve('re_test')).paymentIntentId).toBe('pi_test');
    expect(sdk.retrieve).toHaveBeenCalledExactlyOnceWith('re_test', {}, { timeout: 10000, maxNetworkRetries: 0 });
    expect(sdk.create).not.toHaveBeenCalled();
  });
  it('rejects a live key before accessing the SDK', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_fixture');
    await expect(createStripeRefundProvider().retrieve('re_test')).rejects.toThrow('sandbox');
    expect(sdk.retrieve).not.toHaveBeenCalled();
  });
});
