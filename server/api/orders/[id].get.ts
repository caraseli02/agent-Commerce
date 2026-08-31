import { findDemoOrder } from '~/server/utils/mockDashboardDemo';
import { orders } from '~/server/domain/orders';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const runtimeOrder = await orders.findById(id);

  if (runtimeOrder) {
    return {
      status: 'success',
      data: runtimeOrder,
    };
  }

  const order = findDemoOrder(id);

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found',
    });
  }

  return {
    status: 'success',
    data: {
      order,
      children: [],
    },
  };
});
