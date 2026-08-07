import {
  addBilling,
  addShipping,
  deleteBilling,
  deleteShipping,
  fetchActivityLogs,
  fetchBilling,
  fetchCustomerCredit,
  fetchCustomerDiscount,
  fetchCustomerSettings,
  fetchShipping,
  fetchTransactions,
  markSettingsAsRead,
  toggleCloseCustomerCredit,
  toggleFreezeCustomerCredit,
  updateAccountDetails,
  updateBilling,
  updateCustomerCredit,
  updateCustomerDiscount,
  updateShipping,
} from '~/composables/api/control-panel';
import { fetchCustomerInformation } from '~/composables/api/customer-profile';
import { validateAddress as validateAddressApi } from '~/composables/api/orders';
import { resetPasswordLink } from '~/composables/api/user';

export function useControlPanel() {
  return {
    validateAccountAddress: validateAddressApi,
    updateAccountDetails,
    fetchShipping,
    fetchBilling,
    addShipping,
    updateShipping,
    deleteShipping,
    addBilling,
    updateBilling,
    deleteBilling,
    fetchCustomerSettings,
    markSettingsAsRead,
    fetchCustomerDiscount,
    updateCustomerDiscount,
    fetchCustomerCredit,
    updateCustomerCredit,
    toggleCloseCustomerCredit,
    toggleFreezeCustomerCredit,
    fetchTransactions,
    fetchActivityLogs,
    fetchCustomerInformation,
    resetPasswordLink,
  };
}
