import { getDemoOrdersForUser } from '~~/server/utils/mockDashboardDemo';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');
  const total = getDemoOrdersForUser(userId).reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    status: 'success',
    data: Number(total.toFixed(2)),
  };
});
