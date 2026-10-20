import { getDemoOrdersForUser } from '~~/server/utils/mockDashboardDemo';
import { requireSelfOrAdmin } from '~~/server/utils/requireRequester';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');
  requireSelfOrAdmin(event, userId);
  const pendingOrders = getDemoOrdersForUser(userId).filter((order) => order.status === 'Pending').length;

  return {
    status: 'success',
    data: pendingOrders,
  };
});
