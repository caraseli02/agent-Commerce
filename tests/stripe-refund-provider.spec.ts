import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStripeRefundProvider } from '~~/server/domain/payments/stripe-provider';
const sdk = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn() }));
vi.mock('stripe', () => ({
  default: class {
    refunds = sdk;
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
      { payment_intent: 'pi_test', amount: 1234, reason: 'requested_by_customer', metadata: response.metadata },
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
