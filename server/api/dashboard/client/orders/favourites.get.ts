import { getClientDashboardData } from '~~/server/utils/mockDashboardDemo';
import { getMockUserFromAuthHeader } from '~~/server/utils/mockUsers';

export default defineEventHandler((event) => {
  const data = getClientDashboardData(getMockUserFromAuthHeader(getHeaders(event).authorization)?._id);

  return {
    status: 'success',
    data: data.favorites,
  };
});
