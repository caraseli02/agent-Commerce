import { getDemoCredit } from '~~/server/utils/mockDashboardDemo';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');

  return {
    status: 'success',
    data: getDemoCredit(id),
  };
});
