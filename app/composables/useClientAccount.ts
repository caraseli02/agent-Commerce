import {
  deleteCard as deleteCardApi,
  updateCardAsDefault as updateCardAsDefaultApi,
  updateDetails as updateDetailsApi,
} from '~/composables/api/client-settings';
import { markSettingsAsRead as markSettingsAsReadApi } from '~/composables/api/control-panel';
import { fetchSettings as fetchGeneralSettingsApi } from '~/composables/api/settings';
import {
  addBillingAsCustomer as addBillingAsCustomerApi,
  addShippingAsCustomer as addShippingAsCustomerApi,
  deleteBillingAsCustomer as deleteBillingAsCustomerApi,
  deleteShippingAsCustomer as deleteShippingAsCustomerApi,
  resetPasswordLink as resetPasswordLinkApi,
  updateBillingAsCustomer as updateBillingAsCustomerApi,
  updateShippingAsCustomer as updateShippingAsCustomerApi,
  userCards as userCardsApi,
} from '~/composables/api/user';
import type { StripeCardInterface } from '~~/types';
import type { CardsResponse } from '~~/types/auth/account-settings';

function isStatusPayload(value: unknown): value is { status: string } {
  return Boolean(value && typeof value === 'object' && typeof (value as { status?: unknown }).status === 'string');
}

function isCardsResponse(value: unknown): value is CardsResponse {
  return isStatusPayload(value) && Array.isArray((value as { data?: unknown }).data);
}

export function useClientAccount() {
  const loadUserCards = async (): Promise<StripeCardInterface[]> => {
    const response = await userCardsApi();

    if (!isCardsResponse(response) || response.status !== 'success') {
      return [];
    }

    return response.data;
  };

  const setDefaultCard = async (cardId: string): Promise<boolean> => {
    const response = await updateCardAsDefaultApi(cardId);
    return isStatusPayload(response) && response.status === 'success';
  };

  const removeCard = async (cardId: string): Promise<boolean> => {
    const response = await deleteCardApi(cardId);
    return isStatusPayload(response) && response.status === 'success';
  };

  const saveAccountDetails = async (payload: object): Promise<boolean> => {
    const response = await updateDetailsApi(payload);
    return isStatusPayload(response) && response.status === 'success';
  };

  return {
    loadUserCards,
    setDefaultCard,
    removeCard,
    saveAccountDetails,
    addBillingAsCustomer: addBillingAsCustomerApi,
    updateBillingAsCustomer: updateBillingAsCustomerApi,
    deleteBillingAsCustomer: deleteBillingAsCustomerApi,
    addShippingAsCustomer: addShippingAsCustomerApi,
    updateShippingAsCustomer: updateShippingAsCustomerApi,
    deleteShippingAsCustomer: deleteShippingAsCustomerApi,
    resetPasswordLink: resetPasswordLinkApi,
    markSettingsAsRead: markSettingsAsReadApi,
    fetchGeneralSettings: fetchGeneralSettingsApi,
  };
}
