// ~/composables/useUser.ts
import { computed } from 'vue';
import { useAuthStore } from '~/store/authStore';
import { AccountType } from '~/types';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

export function useUser() {
  const store = useAuthStore();
  const user = computed(() => store.getUserDetails);

  const fallbackAddress: ShippingAddressInterface = {
    alias: 'N/A',
    name1: 'N/A',
    name2: 'N/A',
    default: false,
    country: 'N/A',
    region: 'N/A',
    city: 'N/A',
    postcode: 'N/A',
    phone: 'N/A',
  };

  const getShipping = () => {
    if (!user.value) return fallbackAddress;

    const addressList =
      user.value.accountType === AccountType.Personal
        ? user.value.personalDetails?.shippingAddress
        : user.value.companyDetails?.shippingAddress;

    const address = (addressList as ShippingAddressInterface[])?.find((addr) => addr.default) || addressList?.[0];

    return address ? { ...address, alias: address.alias || 'Address' } : fallbackAddress;
  };

  const getBilling = () => {
    if (!user.value) return fallbackAddress;

    const addressList =
      user.value.accountType === AccountType.Personal
        ? user.value.personalDetails?.billingAddress
        : user.value.companyDetails?.billingAddress;

    const address = (addressList as ShippingAddressInterface[])?.find((addr) => addr.default) || addressList?.[0];

    return address ? { ...address, alias: address.alias || 'Address' } : fallbackAddress;
  };

  return { user, getShipping, getBilling };
}
