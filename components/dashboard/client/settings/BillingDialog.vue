<script setup lang="ts">
import { Building2Icon, PlusCircleIcon } from '@lucide/vue';
import { ref, toRef } from 'vue';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useClientAccount } from '~/composables/useClientAccount';
import { useClientAddressManager } from '~/composables/useClientAddressManager';
import type { AccountType } from '~/types';
import type { BillingAddressInterface } from '~/types/auth/user-interface';

const { addBillingAsCustomer, updateBillingAsCustomer } = useClientAccount();

const props = defineProps<{
  address: BillingAddressInterface | null;
  accountType: AccountType;
}>();

const isOpen = defineModel<boolean>();

const emit = defineEmits(['addBillingAddress']);

const typeOfDialog = ref('');

const { countries, country, region, regions, showErrorMsg, onCloseDialog, onSubmit } = useClientAddressManager({
  address: toRef(props, 'address'),
  isOpen,
  addAddress: addBillingAsCustomer,
  updateAddress: updateBillingAsCustomer,
  onSuccess: async (payload) => {
    emit('addBillingAddress', payload);
  },
});
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogTrigger as-child>
      <UiButton class="rounded-full" size="icon" variant="ghost">
        <PlusCircleIcon class="aspect-square w-10 h-10 stroke-1 text-blue-500" />
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent ref="dialog" class="max-w-[350px] sm:max-w-[640px] rounded-xl">
      <UiDialogHeader>
        <UiDialogTitle>{{ (typeOfDialog === 'edit' ? 'Edit ' : 'Add ') + 'Billing Address' }}</UiDialogTitle>
      </UiDialogHeader>
      <section class="flex flex-col self-stretch bg-white rounded-xl shadow-sm max-md:px-5 max-h-[85vh] overflow-y-auto">
        <form class="mt-5 flex flex-col gap-y-6 gap-x-9" @submit="onSubmit">
          <FormField v-slot="{ componentField }" name="addressAlias">
            <FormItem>
              <FormLabel>Address Alias</FormLabel>
              <FormControl>
                <section class="flex items-center">
                  <div class="flex items-center justify-center w-11 h-11 rounded-l-lg bg-stone-50 border border-grey-300">
                    <Building2Icon class="w-5 h-5" />
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
                <UiInput type="text" placeholder="Address Line 1" v-bind="componentField" />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="addressLine2">
            <FormItem>
              <FormLabel>Address Line 2</FormLabel>
              <FormControl>
                <UiInput type="text" placeholder="Address Line 2" v-bind="componentField" />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="postcode">
            <FormItem>
              <FormLabel>Postcode</FormLabel>
              <FormControl>
                <UiInput type="text" placeholder="Postcode" v-bind="componentField" />
              </FormControl>
              <FormMessage v-if="showErrorMsg" />
            </FormItem>
          </FormField>

          <div class="flex justify-end gap-4 col-span-2 sticky bottom-0 bg-white pt-2">
            <UiButton variant="secondary" type="reset" @click="onCloseDialog()"> Cancel </UiButton>
            <UiButton type="submit" class="w-60"> Save </UiButton>
          </div>
        </form>
      </section>
    </UiDialogContent>
  </UiDialog>
</template>

<style scoped>
@reference "../../../../assets/css/main.css";
label {
  @apply text-slate-500;
}
</style>
