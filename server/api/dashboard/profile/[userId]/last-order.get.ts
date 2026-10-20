import { getDemoOrders, getDemoOrdersForUser } from '~~/server/utils/mockDashboardDemo';
import { requireSelfOrAdmin } from '~~/server/utils/requireRequester';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');
  requireSelfOrAdmin(event, userId);
  const orders = getDemoOrdersForUser(userId);

  return {
    status: 'success',
    data: orders[0] || getDemoOrders(userId)[0] || null,
  };
});
