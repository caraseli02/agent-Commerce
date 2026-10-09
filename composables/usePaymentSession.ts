import { ref } from 'vue';
import { refreshPaymentSession, restartPaymentSession, resumePaymentSession } from './api/payment-session';
import { parseCheckoutErrorCode } from '~/types/order/checkout-error';
import { checkoutFailurePresentation } from '~/helpers/checkout-error-presentation';

type SessionState =
  | 'checking'
  | 'ready'
  | 'confirming'
  | 'processing'
  | 'paid-finalizing'
  | 'completed'
  | 'canceled'
  | 'recovery-required'
  | 'compensation'
  | 'disabled';
const defaults = { resume: resumePaymentSession, refresh: refreshPaymentSession, restart: restartPaymentSession };

export function usePaymentSession(orderId: string, api = defaults) {
  const state = ref<SessionState>('checking');
  const clientSecret = ref<string>();
  const message = ref('');
  let busy = false;
  let disposed = false;
  const isReady = () => state.value === 'ready';
  const clearAction = () => {
    clientSecret.value = undefined;
  };
  const errorCode = (error: unknown) => {
    const data = (error as { data?: { data?: { code?: unknown }; code?: unknown } })?.data;
    return parseCheckoutErrorCode(data?.data?.code ?? data?.code);
  };
  const needsReconciliation = (error: unknown) => ['checkout_not_payable', 'payment_recovery_required'].includes(errorCode(error) || '');
  const fail = (error: unknown) => {
    if (disposed) return;
    clearAction();
    const code = errorCode(error);
    state.value = code === 'stripe_payments_disabled' ? 'disabled' : 'recovery-required';
    message.value = checkoutFailurePresentation({ code }).message;
  };
  const resume = async () => {
    const result = await api.resume(orderId);
    if (disposed) return;
    if (result.kind === 'requires-action') {
      clientSecret.value = result.nextAction.clientSecret;
      state.value = 'ready';
    } else state.value = 'processing';
  };
  const refresh = async () => {
    const result = await api.refresh(orderId);
    if (disposed) return;
    if (result.kind === 'pending') await resume();
    else if (result.kind === 'not-found') {
      state.value = 'recovery-required';
      message.value = 'This order is not available in your session.';
    } else state.value = result.kind;
  };
  const check = async (returned = false) => {
    if (busy || disposed) return;
    busy = true;
    clearAction();
    state.value = 'checking';
    message.value = '';
    try {
      if (returned) await refresh();
      else {
        try {
          await resume();
        } catch (error) {
          // Resume cannot expose terminal provider observations as payment actions.
          // Read-only refresh distinguishes cancellation/paid recovery from unsafe retry.
          if (needsReconciliation(error)) await refresh();
          else throw error;
        }
      }
    } catch (error) {
      fail(error);
    } finally {
      busy = false;
    }
  };
  const confirm = async (submit: (secret: string) => Promise<{ error?: { type?: string } }>) => {
    if (busy || disposed || !isReady() || !clientSecret.value) return;
    busy = true;
    const mountedSecret = clientSecret.value;
    clearAction();
    state.value = 'checking';
    message.value = '';
    try {
      // Revalidate just before Stripe confirmation, not only when the form mounts.
      try {
        await resume();
      } catch (error) {
        if (needsReconciliation(error)) {
          await refresh();
          return;
        }
        throw error;
      }
      if (disposed || !isReady()) return;
      if (clientSecret.value !== mountedSecret) {
        message.value = 'Payment details changed. Check your card details and try again.';
        return;
      }
      state.value = 'confirming';
      const result = await submit(mountedSecret);
      if (disposed) return;
      clearAction();
      // Even success/3DS from Stripe.js is only an observation. ECAS owns payment truth.
      state.value = 'checking';
      await refresh();
      if (result.error && isReady()) message.value = 'Your card could not be confirmed. Check your details or try another card.';
    } catch (error) {
      fail(error);
    } finally {
      busy = false;
    }
  };
  const restart = async () => {
    if (busy || disposed || state.value !== 'canceled') return false;
    busy = true;
    clearAction();
    try {
      await api.restart(orderId);
      return !disposed;
    } catch (error) {
      fail(error);
      return false;
    } finally {
      busy = false;
    }
  };
  const dispose = () => {
    disposed = true;
    clearAction();
  };
  return { state, clientSecret, message, check, confirm, restart, dispose };
}
