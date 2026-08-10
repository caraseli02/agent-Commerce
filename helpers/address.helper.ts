import type { GuestCheckoutContact } from '~/types/order-summary/item';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

const PLACEHOLDER_VALUE = 'N/A';

export const createEmptyGuestAddress = (alias: string): ShippingAddressInterface => ({
  alias,
  name1: '',
  name2: '',
  country: 'US',
  region: '',
  city: '',
  postcode: '',
  default: alias.toLowerCase() === 'shipping',
});

export const isPlaceholderAddressValue = (value?: string | null): boolean => {
  if (!value) {
    return true;
  }

  return value.trim() === '' || value.trim().toUpperCase() === PLACEHOLDER_VALUE;
};

export const isCompleteSavedAddress = (address?: ShippingAddressInterface | null): address is ShippingAddressInterface => {
  if (!address) {
    return false;
  }

  return (
    !isPlaceholderAddressValue(address.name1) &&
    !isPlaceholderAddressValue(address.city) &&
    !isPlaceholderAddressValue(address.region) &&
    !isPlaceholderAddressValue(address.postcode) &&
    !isPlaceholderAddressValue(address.country)
  );
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isCompleteGuestContact = (contact?: GuestCheckoutContact | null): contact is GuestCheckoutContact => {
  if (!contact) {
    return false;
  }

  return (
    !isPlaceholderAddressValue(contact.firstName) &&
    !isPlaceholderAddressValue(contact.lastName) &&
    !isPlaceholderAddressValue(contact.phone) &&
    EMAIL_PATTERN.test(contact.email.trim())
  );
};
