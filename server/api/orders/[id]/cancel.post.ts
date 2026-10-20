import { cancelRuntimeOrder } from '~~/server/utils/mockRuntimeOrders';
import { requireOwnedOrder } from '~~/server/utils/requireRequester';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  await requireOwnedOrder(event, id);
  cancelRuntimeOrder(id);

  return {
    status: 'success',
    description: 'Order canceled successfully.',
  };
});
