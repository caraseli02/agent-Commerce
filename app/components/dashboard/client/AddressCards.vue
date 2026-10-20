<template>
  <div
    v-for="(address, index) in addresses"
    :key="index"
    :aria-label="index === 0 ? 'Shipping' : 'Billing'"
    role="group"
    class="items-stretch shadow-xs bg-card flex w-full lg:max-w-[476px] xl:max-w-md flex-col p-6 rounded-xl"
  >
    <section class="justify-between items-stretch flex gap-5">
      <div class="text-foreground text-sm font-medium leading-5">
        {{ index === 0 ? 'Shipping' : 'Billing' }}
      </div>
      <UiButton variant="ghost" class="p-1 w-10 h-10" @click="openSettingTab(index === 0 ? 'Shipping' : 'Billing')">
        <SvgoEditGray24 class="text-slate-300 hover:text-blue-500" />
      </UiButton>
    </section>
    <div aria-label="Address Details" role="group" class="items-stretch flex justify-between gap-3 mt-6">
      <SvgoAddressBuilding />
      <div role="form" class="items-stretch flex grow basis-[0%] flex-col text-sm text-foreground">
        <div class="font-medium leading-5">
          {{ address.alias }}
        </div>
        <div class="leading-5 mt-1">
          {{ address.name1 }}
        </div>
        <div class="leading-5 mt-1">
          {{ address.name2 }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShippingAddressInterface } from '~~/types/auth/user-interface';

import { useCustomerDashboard } from '@/composables/useCustomerDashboard';

const { activeOrderFilter } = useCustomerDashboard();

const route = useRoute();
const openSettingTab = (scrollTo: string) => {
  route.query.scrollTo = scrollTo;
  activeOrderFilter.value = {
    value: 'settings',
  };
};

defineProps<{
  addresses: Array<ShippingAddressInterface>;
}>();
</script>
