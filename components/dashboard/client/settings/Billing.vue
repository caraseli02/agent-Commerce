<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import AddressList from './AddressList.vue';
import BillingDialog from './BillingDialog.vue';
import { useAuthStore } from '~/store/authStore';
import { AccountType } from '~/types';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';
import { updateStoreDetails } from '~/helpers/auth-store.helper';
import { deleteBillingAsCustomer, updateBillingAsCustomer } from '~/composables/api/user';

interface AddressData {
  icon: string;
  alias: string;
  default: boolean;
  name: string;
  address: string;
  phone: string;
  _id: string;
  name1: string;
  name2: string;
  city: string;
  country: string;
  postcode: string;
  region: string;
}

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);
const accountType = ref(getUserDetails.value.accountType);

const formatAddresses = () => {
  const { accountType, personalDetails, companyDetails } = getUserDetails.value;
  const addresses = accountType === AccountType.Personal ? personalDetails?.billingAddress : companyDetails?.billingAddress;

  return addresses?.map((address, index) => {
    const name = accountType === AccountType.Personal ? `${personalDetails?.firstName} ${personalDetails?.lastName}` : companyDetails?.name;

    const formattedAddress = [address.name1, address.name2, address.city, address.postcode, address.country].filter(Boolean).join(', ');

    return {
      alias: address.alias || `Billing Address Alias ${index + 1}`,
      default: address.default || false,
      name,
      address: formattedAddress,
      phone: address.phone || '',
      icon: '',
      _id: address._id,
      name1: address.name1,
      name2: address.name2,
      city: address.city,
      country: address.country,
      postcode: address.postcode,
      region: address.region,
    };
  }) as unknown as AddressData[];
};

const isDialogOpen = ref(false);

watch(isDialogOpen, async (isOpen) => {
  if (!isOpen) {
    addressToBeEdited.value = null;
  }
});
const addresses = computed(formatAddresses);

const addressToBeEdited = ref<AddressData | null>(null);

const handleEdit = async (editedAddress: AddressData) => {
  isDialogOpen.value = true;
  addressToBeEdited.value = editedAddress;
};

const handleDelete = async (deletedAddress: AddressData) => {
  await deleteBillingAsCustomer(deletedAddress._id);
  await updateStoreDetails();
};

const handleSetDefault = async (changedAddress: AddressData) => {
  changedAddress.default = true;
  await handleChange(changedAddress);
};

const handleChange = async (address: ShippingAddressInterface) => {
  if (getUserDetails.value.firebaseId) {
    await updateBillingAsCustomer(address);
    await updateStoreDetails();
  }
};

const handleAdd = async (_address: ShippingAddressInterface) => {
  await updateStoreDetails();
};
</script>

<template>
  <section id="Billing" class="flex flex-col gap-9 self-stretch p-4 md:p-6 bg-white rounded-xl shadow-l">
    <div class="flex gap-2.5 justify-between w-full max-md:flex-wrap max-md:max-w-full">
      <h2 class="self-start text-xl font-semibold leading-7 text-neutral-700">Billing</h2>
    </div>
    <AddressList :addresses="addresses" @edit="handleEdit" @delete="handleDelete" @set-default="handleSetDefault" />
    <section class="flex justify-center items-center self-stretch p-4 rounded-xl border border-blue-500 border-dashed max-md:px-5">
      <BillingDialog
        v-model="isDialogOpen"
        :address="addressToBeEdited"
        :account-type="accountType ?? AccountType.Personal"
        @update:is-open="isDialogOpen = $event"
        @add-billing-address="handleAdd"
      />
    </section>
  </section>
</template>

<style scoped></style>
