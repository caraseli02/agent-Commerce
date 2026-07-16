import { getDemoUserProfile } from '~/server/utils/mockDashboardDemo';
import { getRuntimeAddresses } from '~/server/utils/mockRuntimeAddresses';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');
  const profile = getDemoUserProfile(id);
  const addresses = getRuntimeAddresses(id);

  return {
    status: 'success',
    data: {
      ...profile,
      accountType: 0,
      shippingAddress: addresses.shippingAddress,
      billingAddress: addresses.billingAddress,
    },
  };
});
