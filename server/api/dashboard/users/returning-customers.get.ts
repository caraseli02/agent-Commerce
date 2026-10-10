import { getReturningCustomersWidgetMock } from '~~/server/utils/mockAdminCustomers';

export default defineEventHandler(() => {
  return {
    status: 'success',
    data: getReturningCustomersWidgetMock(),
  };
});
