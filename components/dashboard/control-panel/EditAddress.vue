<template>
  <div v-if="isOpen" class="fixed z-[60] top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
    <div
      class="relative flex flex-col z-10 w-[358px] max-w-[calc(100vw-32px)] max-h-[85vh] pt-4 pb-6 bg-white rounded-xl pointer-events-auto shadow-xs md:w-[640px] md:pt-6 md:pb-9"
    >
      <div class="flex items-start justify-between px-4 mb-9 md:px-6">
        <div class="font-semibold leading-[1.5]">{{ dialogTitle }}</div>
        <button
          class="w-8 h-8 bg-gray-100 flex items-center justify-center text-slate-500 rounded-lg ml-auto mb-4 transition-colors duration-300 hover:text-blue-500"
          type="button"
          @click="onCloseDialog()"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto scrollbar-thin mr-1">
        <form class="grid grid-cols-1 gap-6 pl-4 pr-3 mb-9 md:pl-6 md:pr-3" @submit="onSubmit">
          <FormField v-slot="{ componentField }" name="addressAlias">
            <FormItem>
              <FormLabel>Address Alias</FormLabel>
              <FormControl>
                <section class="flex items-center">
                  <div class="flex items-center justify-center w-11 h-11 rounded-l-lg bg-stone-50 border border-grey-300">
                    <BusinessIcon class="w-5 h-5" />
                  </div>
                  <UiInput class="rounded-l-[0px] border-l-0" type="text" v-bind="componentField" placeholder="Address Alias 1" />
                </section>
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <section class="flex flex-col md:flex-row justify-between gap-6">
            <FormField name="country">
              <FormItem class="flex flex-col w-full">
                <FormControl>
                  <FormSelect
                    v-model="country"
                    :options="countries"
                    :show-disabled-styles="false"
                    label="Country"
                    placeholder="United States"
                    search
                    size="lg"
                    class="relative z-20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField name="county">
              <FormItem class="flex flex-col w-full">
                <FormControl>
                  <FormSelect
                    v-model="region"
                    :options="regions"
                    :show-disabled-styles="false"
                    label="Region"
                    placeholder="New York"
                    search
                    size="lg"
                    class="relative z-20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>

          <FormField v-slot="{ componentField }" name="city">
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <UiInput type="text" placeholder="Bucharest" v-bind="componentField" />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="addressLine1">
            <FormItem>
              <FormLabel>Address Line 1</FormLabel>
              <FormControl>
                <UiInput type="text" placeholder="5073 Mark Brown Rd" v-bind="componentField" />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="addressLine2">
            <FormItem>
              <FormLabel>Address Line 2</FormLabel>
              <FormControl>
                <UiInput type="text" placeholder="NE Dalton" v-bind="componentField" />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="postcode">
            <FormItem>
              <FormLabel>Postcode</FormLabel>
              <FormControl>
                <UiInput type="text" placeholder="W1A5AB" v-bind="componentField" />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-[auto,auto,1fr] md:pl-0">
            <button
              v-if="deleteButtonEnable"
              class="flex items-center justify-center rounded-lg text-rose-500 py-[7px] px-7 border border-[#FA4B4B]"
              type="button"
              @click="handleDelete()"
            >
              <TrashIcon class="w-6 h-6 mr-2" />
              <span class="font-medium leading-[1.75]"> Delete </span>
            </button>
            <button class="flex px-[41px] py-2 rounded-lg bg-gray-100 leading-[1.75] text-slate-500 font-medium" type="button" @click="onCloseDialog()">
              Cancel
            </button>
            <button class="flex justify-center px-5 py-2 rounded-lg bg-blue-500 leading-[1.75] text-white font-medium" type="submit">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch, type Ref } from 'vue';
import { useNuxtApp, useRoute } from '#app';

import BusinessIcon from '@/assets/icons/dashboard/business.svg';
import TrashIcon from '@/assets/icons/dashboard/trash.svg';
import XIcon from '@/assets/icons/dashboard/x.svg';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateBilling, updateShipping } from '~/composables/api/control-panel';
import { useClientAddressManager } from '~/composables/useClientAddressManager';
import type { BillingAddressInterface, ShippingAddressInterface } from '~/types/auth/user-interface';

const props = defineProps<{
  address: ShippingAddressInterface | BillingAddressInterface;
  index: number;
  deleteButtonEnable: boolean;
  type: 'shipping' | 'billing';
}>();

const emit = defineEmits(['close', 'saved', 'delete-shipping-address', 'delete-billing-address']);
const route = useRoute();
const { $apiClient } = useNuxtApp();
const isOpen = ref(false);
const address = toRef(props, 'address') as Ref<ShippingAddressInterface | BillingAddressInterface | null>;

const dialogTitle = computed(() => (props.type === 'shipping' ? 'Edit Shipping Details' : 'Edit Billing Details'));

const persistAddress = async (payload: ShippingAddressInterface): Promise<{ status: string; data: string }> => {
  const userId = String(route.params.slug ?? '');

  return props.type === 'shipping'
    ? ((await updateShipping(payload, userId, $apiClient)) as { status: string; data: string })
    : ((await updateBilling(payload, userId, $apiClient)) as { status: string; data: string });
};

const { countries, country, region, regions, showErrorMsg, onCloseDialog, onSubmit } = useClientAddressManager({
  address,
  isOpen,
  addAddress: persistAddress,
  updateAddress: persistAddress,
  onSuccess: async () => {
    emit('saved');
  },
});

onMounted(() => {
  isOpen.value = true;
});

watch(isOpen, (open) => {
  if (!open) {
    emit('close');
  }
});

const handleDelete = async () => {
  if (props.type === 'shipping') {
    emit('delete-shipping-address', props.index);
  } else {
    emit('delete-billing-address', props.index);
  }

  onCloseDialog();
};
</script>
