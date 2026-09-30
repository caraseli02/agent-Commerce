import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockToken } from '~/server/utils/mockUsers';

const checkout = vi.hoisted(() => ({
  enabled: vi.fn(() => false),
  resume: vi.fn(),
}));

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return { ...actual, getCookie: (event: FakeEvent, name: string) => event.cookies?.[name] };
});
vi.mock('~/server/application/checkout/stripe-payment', () => ({ stripePaymentsEnabled: checkout.enabled }));
vi.mock('~/server/application/checkout/resume-order-payment', () => ({ resumeOrderPayment: checkout.resume }));

type FakeEvent = {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  params?: Record<string, string>;
};

let route: (event: FakeEvent) => Promise<unknown>;
let mockModeEnabled = true;

describe('unpaid payment resume route', () => {
  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('getHeaders', (event: FakeEvent) => event.headers ?? {});
    vi.stubGlobal('getRouterParam', (event: FakeEvent, name: string) => event.params?.[name]);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: mockModeEnabled } }));
    vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string; data?: unknown }) =>
      Object.assign(new Error(payload.statusMessage), payload),
    );
    route = (await import('~/server/api/orders/[id]/resume-payment.post')).default as unknown as (event: FakeEvent) => Promise<unknown>;
  });

  beforeEach(() => {
    mockModeEnabled = true;
    checkout.enabled.mockReset();
    checkout.enabled.mockReturnValue(false);
    checkout.resume.mockReset();
  });

  it('rejects a request while the Stripe gate is off without running checkout recovery', async () => {
    await expect(route({ cookies: { 'guest-session-id': 'resume-route' }, params: { id: 'ord-1' } })).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'stripe_payments_disabled' },
    });
    expect(checkout.resume).not.toHaveBeenCalled();
  });

  it('requires a trusted owner and never creates a guest identity on resume', async () => {
    checkout.enabled.mockReturnValue(true);
    await expect(route({ params: { id: 'ord-1' } })).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      route({ headers: { authorization: `Bearer ${createMockToken('guest-user-session-forged')}` }, params: { id: 'ord-1' } }),
    ).rejects.toMatchObject({ statusCode: 401 });
    mockModeEnabled = false;
    await expect(route({ cookies: { 'guest-session-id': 'resume-route' }, params: { id: 'ord-1' } })).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(checkout.resume).not.toHaveBeenCalled();
  });

  it('returns only the checked payment action for an existing owner', async () => {
    checkout.enabled.mockReturnValue(true);
    checkout.resume.mockResolvedValue({
      kind: 'requires-action',
      nextAction: { type: 'client-secret', clientSecret: 'pi_existing_secret_test' },
    });

    await expect(
      route({ headers: { authorization: `Bearer ${createMockToken('mock-customer-1')}` }, params: { id: 'ord-1' } }),
    ).resolves.toEqual({
      status: 'success',
      data: { kind: 'requires-action', nextAction: { type: 'client-secret', clientSecret: 'pi_existing_secret_test' } },
    });
    expect(checkout.resume).toHaveBeenCalledWith({ ownerId: 'mock-customer-1', orderId: 'ord-1' });
  });

  it('returns processing without payment credentials', async () => {
    checkout.enabled.mockReturnValue(true);
    checkout.resume.mockResolvedValue({ kind: 'processing' });

    await expect(route({ cookies: { 'guest-session-id': 'resume-route' }, params: { id: 'ord-1' } })).resolves.toEqual({
      status: 'success',
      data: { kind: 'processing' },
    });
  });

  it('does not expose a missing or foreign checkout through the public route', async () => {
    checkout.enabled.mockReturnValue(true);
    checkout.resume.mockResolvedValue({ kind: 'not-found' });

    await expect(route({ cookies: { 'guest-session-id': 'resume-route' }, params: { id: 'ord-foreign' } })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(checkout.resume).toHaveBeenCalledWith({ ownerId: 'guest-user-session-resume-route', orderId: 'ord-foreign' });
  });

  it('does not grant an administrator access to another owner’s payment', async () => {
    checkout.enabled.mockReturnValue(true);
    checkout.resume.mockResolvedValue({ kind: 'not-found' });

    await expect(
      route({ headers: { authorization: `Bearer ${createMockToken('mock-admin-1')}` }, params: { id: 'ord-customer' } }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(checkout.resume).toHaveBeenCalledWith({ ownerId: 'mock-admin-1', orderId: 'ord-customer' });
  });

  it.each([
    [{ kind: 'not-payable' }, 'checkout_not_payable'],
    [{ kind: 'unavailable', productId: 'prod-1', requested: 2, available: 0 }, 'inventory_unavailable'],
    [{ kind: 'recovery-required' }, 'payment_recovery_required'],
  ])('keeps %s non-actionable with a stable conflict code', async (result, code) => {
    checkout.enabled.mockReturnValue(true);
    checkout.resume.mockResolvedValue(result);

    await expect(route({ cookies: { 'guest-session-id': 'resume-route' }, params: { id: 'ord-1' } })).rejects.toMatchObject({
      statusCode: 409,
      data: { code },
    });
  });
});
