<template>
  <div>
    <h2 class="text-xl leading-[1.4] font-semibold mb-9">Shipping</h2>
    <div class="grid grid-cols-1 gap-6">
      <div
        v-for="(address, index) in addresses"
        :key="index"
        class="p-4 border border-dashed border-border rounded-xl md:flex md:items-center md:justify-between"
      >
        <div class="flex items-center gap-4 max-md:mb-9">
          <BusinessIcon class="w-8 h-8 flex-shrink-0 text-slate-500" />
          <div class="md:w-[301px] lg:w-auto">
            <div class="flex items-center mb-2">
              <div class="font-semibold leading-normal md:mr-6">
                {{ address.alias || 'Address Alias ' + (index + 1) }}
              </div>
              <div v-if="address.default" class="flex items-center gap-1 bg-[#00D395] rounded-[100px] px-2 py-1 text-white max-md:hidden">
                <CheckIcon class="w-4 h-4" />
                <span class="text-xs font-medium leading-[1.3333]">Default</span>
              </div>
            </div>
            <div class="text-sm leading-[1.42857] text-slate-500">
              {{
                address.name1 +
                ', ' +
                (address.name2 ? address.name2 + ', ' : '') +
                address.region +
                ', ' +
                (address.postcode ? address.postcode + ', ' : '') +
                address.country
              }}
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div v-if="address.default" class="flex items-center gap-1 bg-[#00D395] rounded-[100px] px-2 py-1 text-white md:hidden">
            <CheckIcon class="w-4 h-4" />
            <span class="text-xs font-medium leading-[1.3333]">Default</span>
          </div>
          <div class="flex items-center gap-4 ml-auto">
            <button
              v-if="!address.default"
              class="flex items-center justify-center w-11 h-11 bg-[#F2F2F2] bg-opacity-95 rounded-full text-slate-500 transition-colors duration-300 hover:bg-blue-500 hover:text-white"
              @click="setAsDefault(address)"
            >
              <CheckIcon class="w-5 h-5" />
            </button>
            <button
              class="flex items-center justify-center w-11 h-11 bg-[#F2F2F2] bg-opacity-95 rounded-full text-slate-500 transition-colors duration-300 hover:bg-blue-500 hover:text-white"
              @click="
                editAddressModal = address;
                indexOfEditAddressModal = index;
              "
            >
              <EditIcon class="w-5 h-5" />
            </button>
            <button
              v-if="addresses.length > 1"
              class="flex items-center justify-center w-11 h-11 bg-[#F2F2F2] bg-opacity-95 rounded-full text-slate-500 transition-colors duration-300 hover:bg-blue-500 hover:text-white"
              @click="handleDeleteAddress(index)"
            >
              <TrashIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <button
        class="flex items-center justify-center p-3 border border-dashed border-blue-500 rounded-xl md:p-4"
        @click="addAddressModal = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 40 40" class="w-8 h-8 text-blue-500 md:w-10 md:h-10">
          <path stroke="#007FFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12v16m8-8H12" />
          <rect width="38" height="38" x="1" y="1" stroke="#007FFF" stroke-width="2" rx="19" />
        </svg>
      </button>
    </div>
    <Teleport to="body">
      <Transition name="fade">
        <DashboardControlPanelAddAddress
          v-if="addAddressModal"
          :type="'shipping'"
          @close="addAddressModal = false"
          @add-shipping-address="handleAddAddress"
        />
      </Transition>
      <Transition name="fade">
        <DashboardControlPanelEditAddress
          v-if="editAddressModal"
          :index="indexOfEditAddressModal"
          :address="editAddressModal"
          :type="'shipping'"
          :delete-button-enable="addresses.length > 1"
          @edit-shipping-address="handleEditAddress"
          @close="editAddressModal = null"
          @delete-shipping-address="handleDeleteAddress"
        />
      </Transition>
      <div
        class="fixed z-50 top-0 left-0 w-full h-full bg-[#2F3241]/10 transition-all duration-300 cursor-pointer"
        :class="[addAddressModal || editAddressModal ? 'backdrop-blur-[7.5px]' : 'backdrop-blur-0 opacity-0 pointer-events-none']"
        @click="
          addAddressModal = false;
          editAddressModal = null;
        "
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import EditIcon from '@/assets/icons/dashboard/edit.svg';
import BusinessIcon from '@/assets/icons/dashboard/business.svg';
import CheckIcon from '@/assets/icons/check-circle.svg';
import TrashIcon from '@/assets/icons/dashboard/trash.svg';
import { useNuxtApp } from '#app';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';
import type { AddAddressPayload, EditAddressPayload, ShippingAddressesData, ValidateAddressResult } from '~/types/dashboard/control-panel';
import { resolveFormValue } from '~/types/global/form';
import { toast } from '~/components/ui/toast';
import { validateAddress } from '~/composables/api/orders';

const route = useRoute();
const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));

const addAddressModal = ref(false);
const editAddressModal = ref<ShippingAddressInterface | null>(null);
const indexOfEditAddressModal = ref(0);
const { $api, $apiClient } = useNuxtApp();
const defaultAddressIndex = ref(0);
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  accountType: {
    type: Number,
    required: true,
  },
});
const addresses = ref<ShippingAddressInterface[]>([] as ShippingAddressInterface[]);
const newAddress = ref<ShippingAddressInterface>({} as ShippingAddressInterface);

const setAsDefault = async (address: ShippingAddressInterface) => {
  addresses.value.forEach((item) => {
    item.default = false;
  });
  address.default = true;

  addresses.value.forEach((item, index) => {
    if (item.default === true) {
      defaultAddressIndex.value = index;
    }
  });

  if (!props.id || props.accountType === null || typeof props.accountType === 'undefined') {
    return;
  }
  await $api.controlPanel.updateShipping(address, route.params.slug as string);
};

const handleAddAddress = async (val: AddAddressPayload) => {
  addAddressModal.value = false;
  newAddress.value = {} as ShippingAddressInterface;

  newAddress.value.alias = val.address.alias.value;
  newAddress.value.name1 = val.address.name1.value;
  newAddress.value.name2 = val.address.name2.value;
  newAddress.value.country = resolveFormValue(val.address.country.value);
  newAddress.value.city = val.address.city.value;
  newAddress.value.region = resolveFormValue(val.address.region.value);
  newAddress.value.phone = val.address.phone.value;
  newAddress.value.postcode = val.address.postcode.value;
  newAddress.value.default = false;

  const result = (await validateAddress({ ...newAddress.value }, $apiClient)) as ValidateAddressResult;

  if (!result.data.valid) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Invalid address',
    });
    return;
  } else {
    addresses.value.push(newAddress.value);
    if (!props.id || props.accountType === null || typeof props.accountType === 'undefined') {
      return;
    }
    await $api.controlPanel.addShipping(newAddress.value, route.params.slug as string);
    await getShippingInformation();
  }
};

const getShippingInformation = async () => {
  if (!props.id || props.accountType === null || typeof props.accountType === 'undefined') {
    return;
  }
  try {
    const response = (await $api.controlPanel.fetchShipping(props.id, props.accountType)) as {
      status: string;
      data: ShippingAddressesData;
    };

    if (response.status !== 'success') {
      return;
    }
    addresses.value = response.data.shippingAddress;
    addAddressModal.value = false;
  } catch {
    if (!isMockMode.value) {
      return;
    }

    addresses.value = [
      {
        _id: 'shipping-1',
        alias: 'Main address',
        name1: '5073 Mark Brown Rd',
        name2: '',
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        postcode: '94105',
        phone: '+1-202-555-0100',
        default: true,
      },
    ];
  }
};
await getShippingInformation();

const handleEditAddress = async (object: EditAddressPayload) => {
  editAddressModal.value = null;
  const addressToBeVerified = {
    alias: object.address.alias.value,
    name1: object.address.name1.value,
    name2: object.address.name2.value,
    city: object.address.city.value,
    country: resolveFormValue(object.address.country.value),
    region: resolveFormValue(object.address.region.value),
    postcode: object.address.postcode.value,
    phone: object.address.phone.value,
  } as ShippingAddressInterface;

  const result = (await validateAddress(addressToBeVerified, $apiClient)) as ValidateAddressResult;

  if (!result.data.valid) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Invalid address',
    });
    return;
  } else {
    if (!props.id || props.accountType === null || typeof props.accountType === 'undefined') {
      return;
    }
    addresses.value[object.index].alias = object.address.alias.value;
    addresses.value[object.index].name1 = object.address.name1.value;
    addresses.value[object.index].name2 = object.address.name2.value;
    addresses.value[object.index].city = object.address.city.value;
    addresses.value[object.index].country = resolveFormValue(object.address.country.value);
    addresses.value[object.index].region = resolveFormValue(object.address.region.value);
    addresses.value[object.index].postcode = object.address.postcode.value;
    addresses.value[object.index].phone = object.address.phone.value;
    addresses.value[object.index]._id = object.address._id.value;

    await $api.controlPanel.updateShipping(addresses.value[object.index], route.params.slug as string);
    await getShippingInformation();
  }
};

const handleDeleteAddress = async (index: number) => {
  // Handle deleting the address at a specific index
  if (!props.id || props.accountType === null || typeof props.accountType === 'undefined') {
    return;
  }

  if (!addresses?.value[index] || !addresses.value[index]?._id) {
    return;
  }

  if (defaultAddressIndex.value === index) {
    addresses.value[0].default = true;
  }

  await $api.controlPanel.deleteShipping(addresses.value[index]?._id || '', route.params.slug as string);
  addresses.value.splice(index, 1);
  await getShippingInformation();
};
</script>
