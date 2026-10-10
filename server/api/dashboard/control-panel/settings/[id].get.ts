import { getDemoCustomerSettings } from '~~/server/utils/mockDashboardDemo';

export default defineEventHandler(() => {
  return {
    status: 'success',
    data: getDemoCustomerSettings(),
  };
});
