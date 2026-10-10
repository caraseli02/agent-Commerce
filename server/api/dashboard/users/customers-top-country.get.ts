import { getCustomersByCountryWidgetMock } from '~~/server/utils/mockAdminCustomers';

export default defineEventHandler(() => {
  return {
    status: 'success',
    data: getCustomersByCountryWidgetMock(),
  };
});
