import { checkoutErrorResponse } from '~~/types/order/checkout-error';
import { refreshOrderPayment } from '~~/server/application/checkout/refresh-order-payment';
import { stripePaymentsEnabled } from '~~/server/application/checkout/stripe-payment';
import { requireCheckoutOwner } from '~~/server/utils/requireCheckoutOwner';

export default defineEventHandler(async (event) => {
  const ownerId = requireCheckoutOwner(event);
  if (!stripePaymentsEnabled()) throw createError(checkoutErrorResponse('stripe_payments_disabled'));

  const orderId = getRouterParam(event, 'id') || '';
  const state = await refreshOrderPayment({ ownerId, orderId });
  if (state.kind === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Order not found' });
  return { status: 'success', data: state };
});
