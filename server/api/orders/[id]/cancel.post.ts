import { cancelRuntimeOrder } from '~~/server/utils/mockRuntimeOrders';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');
  cancelRuntimeOrder(id);

  return {
    status: 'success',
    description: 'Order canceled successfully.',
  };
});
