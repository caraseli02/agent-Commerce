import { getPaginatedAdminMockCustomers } from '~~/server/utils/mockAdminCustomers';

export default defineEventHandler((event) => {
  return {
    status: 'success',
    data: getPaginatedAdminMockCustomers(event),
  };
});
