import { checkoutErrorResponse } from '~~/types/order/checkout-error';
import { restartCanceledCheckout } from '~~/server/application/checkout/restart-canceled-checkout';
import { requireCheckoutOwner } from '~~/server/utils/requireCheckoutOwner';

export default defineEventHandler(async (event) => {
  const ownerId = requireCheckoutOwner(event);

  const orderId = getRouterParam(event, 'id') || '';
  const result = await restartCanceledCheckout({ ownerId, orderId });
  if (result.kind === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Order not found' });
  if (result.kind === 'not-canceled') throw createError(checkoutErrorResponse('checkout_not_canceled'));
  if (result.kind === 'cart-empty') throw createError(checkoutErrorResponse('cart_empty'));
  if (result.kind === 'recovery-required') throw createError(checkoutErrorResponse('cart_recovery_required'));

  return {
    status: 'success',
    data: { reviewRequired: true, cartId: result.cartId, cartRevision: result.cartRevision },
  };
});
