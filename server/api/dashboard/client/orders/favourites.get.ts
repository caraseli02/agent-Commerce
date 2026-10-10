import { getClientDashboardData } from '~~/server/utils/mockDashboardDemo';

export default defineEventHandler(() => {
  const data = getClientDashboardData();

  return {
    status: 'success',
    data: data.favorites,
  };
});
