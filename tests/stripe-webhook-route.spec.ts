import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const webhook = vi.hoisted(() => ({
  handle: vi.fn(),
  apply: vi.fn(),
  enabled: vi.fn(() => false),
  finalize: vi.fn(),
  terminalize: vi.fn(),
}));

vi.mock('~~/server/domain/payments', () => ({ handleStripeWebhook: webhook.handle }));
vi.mock('~~/server/application/checkout/stripe-payment', () => ({
  stripePayments: { applyVerifiedIntentEvent: webhook.apply },
  stripePaymentsEnabled: webhook.enabled,
}));
vi.mock('~~/server/application/checkout/finalize-paid-checkout', () => ({ finalizePaidCheckout: webhook.finalize }));
vi.mock('~~/server/application/checkout/terminalize-canceled-checkout', () => ({ terminalizeCanceledCheckout: webhook.terminalize }));

type FakeEvent = { rawBody: Buffer; signature?: string };
let route: (event: FakeEvent) => Promise<unknown>;

describe('Stripe webhook route', () => {
  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('readRawBody', async (event: FakeEvent, encoding: unknown) => {
      expect(encoding).toBe(false);
      return event.rawBody;
    });
    vi.stubGlobal('getHeader', (event: FakeEvent, name: string) => {
      expect(name).toBe('stripe-signature');
      return event.signature;
    });
    vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(payload.statusMessage), payload),
    );
    route = (await import('~~/server/api/payments/stripe/webhook.post')).default as unknown as (event: FakeEvent) => Promise<unknown>;
  });

  beforeEach(() => {
    webhook.handle.mockReset();
    webhook.enabled.mockReturnValue(false);
  });

  it('passes the exact raw Buffer and signature to the Payments firewall', async () => {
    const rawBody = Buffer.from('{ "id": "evt_exact" }');
    webhook.handle.mockResolvedValue({ kind: 'accepted' });
    const response = await route({ rawBody, signature: 't=123,v1=abc' });
    expect(response).toEqual({ received: true });
    expect(webhook.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        rawBody,
        signature: 't=123,v1=abc',
        enabled: false,
        applyVerifiedIntentEvent: webhook.apply,
        finalizePaidCheckout: webhook.finalize,
        terminalizeCanceledCheckout: webhook.terminalize,
      }),
    );
  });

  it.each([
    ['invalid-signature', 400],
    ['retry', 503],
  ])('maps %s to HTTP %i', async (kind, statusCode) => {
    webhook.handle.mockResolvedValue({ kind });
    await expect(route({ rawBody: Buffer.from('{}') })).rejects.toMatchObject({ statusCode });
  });
});
