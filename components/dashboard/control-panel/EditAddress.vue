<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent
      class="z-[60] flex max-h-[85vh] w-[358px] max-w-[calc(100vw-32px)] flex-col gap-0 rounded-xl border-none px-0 pb-6 pt-4 shadow-xs md:w-[640px] md:max-w-[640px] md:pb-9 md:pt-6"
    >
      <UiDialogHeader class="mb-9 px-4 pr-14 md:px-6 md:pr-16">
        <UiDialogTitle class="text-base leading-[1.5]">{{ dialogTitle }}</UiDialogTitle>
      </UiDialogHeader>
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
            <UiButton
              v-if="deleteButtonEnable"
              variant="outline"
              class="border-[#FA4B4B] px-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              type="button"
              @click="handleDelete()"
            >
              <TrashIcon class="w-6 h-6 mr-2" />
              <span class="font-medium leading-[1.75]"> Delete </span>
            </UiButton>
            <UiButton variant="secondary" class="px-[41px] leading-[1.75] text-slate-500" type="button" @click="onCloseDialog()">
              Cancel
            </UiButton>
            <UiButton class="w-full px-5 leading-[1.75]" type="submit"> Save </UiButton>
          </div>
        </form>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch, type Ref } from 'vue';
import { useRoute } from '#app';

import BusinessIcon from '@/assets/icons/dashboard/business.svg';
import TrashIcon from '@/assets/icons/dashboard/trash.svg';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useControlPanel } from '~/composables/useControlPanel';
import { useClientAddressManager } from '~/composables/useClientAddressManager';
import type { BillingAddressInterface, ShippingAddressInterface } from '~/types/auth/user-interface';

const { updateBilling, updateShipping } = useControlPanel();

const props = defineProps<{
  address: ShippingAddressInterface | BillingAddressInterface;
  index: number;
  deleteButtonEnable: boolean;
  type: 'shipping' | 'billing';
}>();

const emit = defineEmits(['close', 'saved', 'delete-shipping-address', 'delete-billing-address']);
const route = useRoute();
const isOpen = ref(false);
const address = toRef(props, 'address') as Ref<ShippingAddressInterface | BillingAddressInterface | null>;

const dialogTitle = computed(() => (props.type === 'shipping' ? 'Edit Shipping Details' : 'Edit Billing Details'));

const persistAddress = async (payload: ShippingAddressInterface): Promise<{ status: string; data: string }> => {
  const userId = String(route.params.slug ?? '');

  return props.type === 'shipping' ? await updateShipping(payload, userId) : await updateBilling(payload, userId);
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
