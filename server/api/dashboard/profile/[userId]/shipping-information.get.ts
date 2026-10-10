import { getDemoAddresses } from '~~/server/utils/mockDashboardDemo';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');

  return {
    status: 'success',
    data: getDemoAddresses(userId).shippingAddress,
  };
});
