import { cart } from '~/server/domain/cart';
import { catalog } from '~/server/domain/catalog';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { requireMockCartUserId } from '~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { order?: { cartId?: unknown } };
  const headers = getHeaders(event);
  const authenticatedUser = getMockUserFromAuthHeader(headers.authorization);
  const ownerId = authenticatedUser?._id || requireMockCartUserId(event, headers.authorization);
  const cartId = typeof body.order?.cartId === 'string' ? body.order.cartId : '';
  let quote;

  if (cartId) {
    const cartResult = await cart.getSnapshot({ cartId, ownerId });
    if (cartResult.kind === 'found' && cartResult.snapshot.items.length) {
      const quoteResult = await catalog.quoteItems({
        customer: authenticatedUser || undefined,
        items: cartResult.snapshot.items.map((item) => ({
          productId: item.productId,
          quantity: item.immediateQuantity + item.backorderQuantity,
        })),
      });

      if (quoteResult.kind === 'quoted') {
        quote = {
          currency: quoteResult.quote.currency,
          merchandiseTotal: quoteResult.quote.merchandiseTotal.minor / 100,
          lines: quoteResult.quote.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice.minor / 100,
            lineTotal: line.lineTotal.minor / 100,
          })),
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
