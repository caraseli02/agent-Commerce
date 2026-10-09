import { describe, expect, it, vi } from 'vitest';
import { usePaymentSession } from '~/composables/usePaymentSession';
import { refreshPaymentSession, resumePaymentSession } from '~/composables/api/payment-session';
import { resolveCheckoutOutcome } from '~/helpers/checkout-outcome';
import { PaymentStatusEnum, PaymentTypeEnum } from '~/types';
import type { $Fetch } from 'ofetch';

const action = { kind: 'requires-action', nextAction: { type: 'client-secret', clientSecret: 'pi_1_secret_test' } } as const;
const setup = () => {
  const api = {
    resume: vi.fn().mockResolvedValue(action),
    refresh: vi.fn().mockResolvedValue({ kind: 'pending' }),
    restart: vi.fn().mockResolvedValue({ reviewRequired: true, cartId: 'cart-1', cartRevision: '2' }),
  };
  return { api, session: usePaymentSession('ord-1', api) };
};

describe('Payment Element session authority', () => {
  it('remains disabled without a server action and rejects unknown response shapes', async () => {
    const { api, session } = setup();
    expect(session.state.value).toBe('checking');
    let resolve!: (value: typeof action) => void;
    api.resume.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const pending = session.check();
    expect(session.clientSecret.value).toBeUndefined();
    const submit = vi.fn();
    await session.confirm(submit);
    expect(submit).not.toHaveBeenCalled();
    resolve(action);
    await pending;
    expect(session.state.value).toBe('ready');
    await expect(
      resumePaymentSession(
        'ord-1',
        vi.fn().mockResolvedValue({ status: 'success', data: { kind: 'requires-action' } }) as unknown as $Fetch,
      ),
    ).rejects.toThrow();
    await expect(
      refreshPaymentSession('ord-1', vi.fn().mockResolvedValue({ status: 'success', data: { kind: 'PAID' } }) as unknown as $Fetch),
    ).rejects.toThrow();
  });
  it.each(['success', 'decline', '3ds'])('revalidates before %s confirmation and only trusts ECAS afterwards', async (scenario) => {
    const { api, session } = setup();
    await session.check();
    const submit = vi.fn(async () => {
      expect(api.resume).toHaveBeenCalledTimes(2);
      expect(session.state.value).toBe('confirming');
      return scenario === 'decline' ? { error: { type: 'card_error' } } : {};
    });
    await session.confirm(submit);
    expect(api.refresh).toHaveBeenCalledOnce();
    expect(session.state.value).toBe('ready'); // Stripe success is never local PAID.
    expect(api.resume).toHaveBeenCalledTimes(3);
    expect(session.message.value.includes('another card')).toBe(scenario === 'decline');
  });
  it('does not confirm when renewed safety is denied or a secret changes', async () => {
    const { api, session } = setup();
    await session.check();
    api.resume.mockRejectedValueOnce({ data: { data: { code: 'inventory_unavailable' } } });
    const submit = vi.fn();
    await session.confirm(submit);
    expect(submit).not.toHaveBeenCalled();
    expect(session.state.value).toBe('recovery-required');
    await session.check();
    api.resume.mockResolvedValueOnce({ ...action, nextAction: { type: 'client-secret', clientSecret: 'new-secret' } });
    await session.confirm(submit);
    expect(submit).not.toHaveBeenCalled();
  });
  it.each(['processing', 'paid-finalizing', 'completed', 'canceled', 'recovery-required', 'compensation'])(
    'blocks payment in server %s state',
    async (kind) => {
      const { api, session } = setup();
      api.refresh.mockResolvedValue({ kind, recoveryRequired: true });
      await session.check(true);
      expect(session.state.value).toBe(kind);
      expect(api.resume).not.toHaveBeenCalled();
      const submit = vi.fn();
      await session.confirm(submit);
      expect(submit).not.toHaveBeenCalled();
      expect(session.clientSecret.value).toBeUndefined();
    },
  );
  it('restarts only canceled orders through explicit server review and ignores disposed in-flight actions', async () => {
    const { api, session } = setup();
    expect(await session.restart()).toBe(false);
    api.refresh.mockResolvedValue({ kind: 'canceled' });
    await session.check(true);
    expect(await session.restart()).toBe(true);
    expect(api.restart).toHaveBeenCalledWith('ord-1');
    api.resume.mockImplementation(async () => {
      session.dispose();
      return action;
    });
    await session.check();
    expect(session.clientSecret.value).toBeUndefined();
  });
  it('routes server-prepared cards into the session even in portfolio mock mode', () => {
    expect(
      resolveCheckoutOutcome(
        {
          status: 'success',
          data: { orderId: 'ord-1', status: PaymentStatusEnum.Pending, useExistingPaymentMethod: false, paymentSession: true },
        },
        'ord-1',
        PaymentTypeEnum.Card,
        { mockMode: true },
      ),
    ).toEqual({ kind: 'session', orderId: 'ord-1' });
  });
});
