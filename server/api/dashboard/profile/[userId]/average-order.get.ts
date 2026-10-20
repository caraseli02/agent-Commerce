import { getDemoOrdersForUser } from '~~/server/utils/mockDashboardDemo';
import { requireSelfOrAdmin } from '~~/server/utils/requireRequester';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');
  requireSelfOrAdmin(event, userId);
  const orders = getDemoOrdersForUser(userId);
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const avg = orders.length ? total / orders.length : 0;

  return {
    status: 'success',
    data: Number(avg.toFixed(2)),
  };
});
