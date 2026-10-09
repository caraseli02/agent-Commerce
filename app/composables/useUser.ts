// ~/composables/useUser.ts
import { computed } from 'vue';
import { useAuthStore } from '~/store/authStore';
import { AccountType } from '~/types';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

export function useUser() {
  const store = useAuthStore();
  const user = computed(() => store.getUserDetails);

  const resolveSavedAddress = (addressList?: ShippingAddressInterface[] | null): ShippingAddressInterface | null => {
    if (!user.value || !addressList?.length) {
      return null;
    }

    const address = addressList.find((addr) => addr.default) || addressList[0];

    return address ? { ...address, alias: address.alias || 'Address' } : null;
  };

  const getShipping = (): ShippingAddressInterface | null => {
    const addressList =
      user.value?.accountType === AccountType.Personal
        ? user.value.personalDetails?.shippingAddress
        : user.value?.companyDetails?.shippingAddress;

    return resolveSavedAddress(addressList as ShippingAddressInterface[] | undefined);
  };

  const getBilling = (): ShippingAddressInterface | null => {
    const addressList =
      user.value?.accountType === AccountType.Personal
        ? user.value.personalDetails?.billingAddress
        : user.value?.companyDetails?.billingAddress;

    return resolveSavedAddress(addressList as ShippingAddressInterface[] | undefined);
  };

  return { user, getShipping, getBilling };
}
