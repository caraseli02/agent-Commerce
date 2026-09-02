import { cart } from '~/server/domain/cart';
import { catalog } from '~/server/domain/catalog';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { requireMockCartUserId } from '~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    order?: {
      cartId?: unknown;
      deliveryMethod?: { service?: { id?: unknown } };
      shippingDetails?: { deliveryTypeId?: unknown };
    };
  };
  const headers = getHeaders(event);
  const authenticatedUser = getMockUserFromAuthHeader(headers.authorization);
  const ownerId = authenticatedUser?._id || requireMockCartUserId(event, headers.authorization);
  const cartId = typeof body.order?.cartId === 'string' ? body.order.cartId : '';
  let quote;

  if (cartId) {
    const cartResult = await cart.getSnapshot({ cartId, ownerId });
    if (cartResult.kind === 'found' && cartResult.snapshot.items.length) {
      const selectedDeliveryId = body.order?.deliveryMethod?.service?.id ?? body.order?.shippingDetails?.deliveryTypeId;
      const quoteResult = await catalog.quoteCheckout({
        customer: authenticatedUser || undefined,
        deliveryServiceId:
          typeof selectedDeliveryId === 'string' || typeof selectedDeliveryId === 'number' ? selectedDeliveryId : undefined,
        items: cartResult.snapshot.items.map((item) => ({
          productId: item.productId,
          quantity: item.immediateQuantity + item.backorderQuantity,
        })),
      });

      if (quoteResult.kind === 'quoted') {
        quote = {
          currency: quoteResult.quote.currency,
          merchandiseTotal: quoteResult.quote.merchandiseTotal.minor / 100,
          smallOrderCharge: quoteResult.quote.smallOrderCharge.minor / 100,
          smallOrderTier: quoteResult.quote.smallOrderTier,
          discountTotal: quoteResult.quote.discountTotal.minor / 100,
          shippingTotal: quoteResult.quote.shippingTotal.minor / 100,
          vatRate: quoteResult.quote.vatRate,
          vatTotal: quoteResult.quote.vatTotal.minor / 100,
          grandTotal: quoteResult.quote.grandTotal.minor / 100,
          lines: quoteResult.quote.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            listUnitPrice: line.listUnitPrice.minor / 100,
            discountPercent: line.discountPercent,
            discountTotal: line.discountTotal.minor / 100,
            unitPrice: line.unitPrice.minor / 100,
            lineTotal: line.lineTotal.minor / 100,
            vatTotal: line.vatTotal.minor / 100,
          })),
        };
        return {
          status: 'success',
          data: {
            selected: quoteResult.quote.deliveryOption,
            list: catalog.deliveryOptions,
            quote,
          },
        };
      }
    }
  }

  return {
    status: 'success',
    data: {
      selected: catalog.deliveryOptions[0],
      list: catalog.deliveryOptions,
      quote,
    },
  };
});
