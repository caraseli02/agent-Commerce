import { getDemoAddresses } from '~~/server/utils/mockDashboardDemo';
import { requireSelfOrAdmin } from '~~/server/utils/requireRequester';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');
  requireSelfOrAdmin(event, userId);

  return {
    status: 'success',
    data: getDemoAddresses(userId).shippingAddress,
  };
});
