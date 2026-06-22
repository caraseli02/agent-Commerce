import { getDemoOrdersForUser } from '~/server/utils/mockDashboardDemo';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');
  const pendingOrders = getDemoOrdersForUser(userId).filter((order) => order.status === 'Pending').length;

  return {
    status: 'success',
    data: pendingOrders,
  };
});
