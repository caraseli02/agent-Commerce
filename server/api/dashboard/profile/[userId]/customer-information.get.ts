import { getDemoUserProfile } from '~~/server/utils/mockDashboardDemo';

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId');

  return {
    status: 'success',
    data: getDemoUserProfile(userId),
  };
});
