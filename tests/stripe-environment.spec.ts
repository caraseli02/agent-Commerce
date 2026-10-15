import Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleStripeWebhook } from '~~/server/domain/payments/stripe-webhook';
import { stripeEnvironment } from '~~/server/domain/payments/stripe-environment';

const secret = 'whsec_environment_test';
const signed = (object: 'payment_intent' | 'refund', environment?: string) => {
  const rawBody = Buffer.from(
    JSON.stringify({
      id: 'evt_environment',
      object: 'event',
      type: object === 'refund' ? 'refund.updated' : 'payment_intent.succeeded',
      data: {
        object: {
          object,
          id: object === 'refund' ? 're_environment' : 'pi_environment',
          metadata: environment === undefined ? {} : { agentCommerceEnvironment: environment },
        },
      },
    }),
  );
  return { rawBody, signature: Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString(), secret }) };
};
afterEach(() => vi.unstubAllEnvs());
describe('Stripe account shared across separate environment databases', () => {
  it.each(['payment_intent', 'refund'] as const)('acknowledges a verified foreign %s without touching local authority', async (object) => {
    const applyVerifiedIntentEvent = vi.fn();
    const applyVerifiedRefundEvent = vi.fn();
    const input = {
      ...signed(object, 'preview'),
      environment: 'production' as const,
      signingSecret: secret,
      enabled: true,
      applyVerifiedIntentEvent,
      applyVerifiedRefundEvent,
    };
    expect(await handleStripeWebhook({ ...input, signature: 'bad' })).toEqual({ kind: 'invalid-signature' });
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(applyVerifiedIntentEvent).not.toHaveBeenCalled();
    expect(applyVerifiedRefundEvent).not.toHaveBeenCalled();
  });
  it.each(['production', undefined])('continues current and historical events (%s) through normal authority', async (environment) => {
    const applyVerifiedIntentEvent = vi.fn().mockResolvedValue({ kind: 'paid', paymentId: 'pay_local', orderId: 'ord_local' });
    const finalizePaidCheckout = vi.fn().mockResolvedValue({ kind: 'finalized' });
    expect(
      await handleStripeWebhook({
        ...signed('payment_intent', environment),
        environment: 'production',
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent,
        finalizePaidCheckout,
      }),
    ).toEqual({ kind: 'accepted' });
    expect(applyVerifiedIntentEvent).toHaveBeenCalledOnce();
    expect(finalizePaidCheckout).toHaveBeenCalledWith({ paymentId: 'pay_local', orderId: 'ord_local' });
  });
  it('keeps an unknown environment retryable instead of silently dropping its event', async () => {
    const applyVerifiedIntentEvent = vi.fn();
    expect(
      await handleStripeWebhook({
        ...signed('payment_intent', 'typo'),
        environment: 'production',
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent,
      }),
    ).toEqual({ kind: 'retry' });
    expect(applyVerifiedIntentEvent).not.toHaveBeenCalled();
  });
  it('uses Vercel environment identity and local development without accepting unknown configuration', () => {
    vi.stubEnv('VERCEL_ENV', undefined);
    expect(stripeEnvironment()).toBe('development');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(stripeEnvironment()).toBe('preview');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(stripeEnvironment()).toBe('production');
    vi.stubEnv('VERCEL_ENV', 'typo');
    expect(() => stripeEnvironment()).toThrow('Unknown Stripe');
  });
});
