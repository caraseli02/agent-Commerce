import { deleteCard, updateCardAsDefault, updateDetails } from '~/composables/api/client-settings';
import { markSettingsAsRead } from '~/composables/api/control-panel';
import { fetchSettings as fetchGeneralSettings } from '~/composables/api/settings';
import {
  addBillingAsCustomer,
  addShippingAsCustomer,
  deleteBillingAsCustomer,
  deleteShippingAsCustomer,
  resetPasswordLink,
  updateBillingAsCustomer,
  updateShippingAsCustomer,
  userCards,
} from '~/composables/api/user';

export function useClientAccount() {
  return {
    updateDetails,
    addBillingAsCustomer,
    updateBillingAsCustomer,
    deleteBillingAsCustomer,
    addShippingAsCustomer,
    updateShippingAsCustomer,
    deleteShippingAsCustomer,
    resetPasswordLink,
    fetchUserCards: userCards,
    deleteCard,
    updateCardAsDefault,
    markSettingsAsRead,
    fetchGeneralSettings,
  };
}
