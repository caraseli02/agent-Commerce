import { requireOwnedOrder } from '~~/server/utils/requireRequester';

export default defineEventHandler(async (event) => {
  const order = await requireOwnedOrder(event, getRouterParam(event, 'id'));

  return {
    status: 'success',
    data: order,
  };
});
