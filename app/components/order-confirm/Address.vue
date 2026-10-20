<script setup lang="ts">
import { CheckIcon } from '@lucide/vue';
// Define the data object with properties
const props = defineProps<{
  shippingAddress: {
    name1: string;
    name2: string;
    postcode: string;
    country: string;
    default: boolean;
  };
  billingAddress: {
    name1: string;
    name2: string;
    postcode: string;
    country: string;
  };
}>();
</script>

<template>
  <div class="flex gap-9 max-md:flex-col max-md:gap-0">
    <div class="flex flex-col w-6/12 max-md:ml-0 max-md:w-full">
      <div class="flex flex-col grow max-md:mt-9 max-md:max-w-full">
        <h2 class="text-base font-semibold leading-7 text-foreground max-md:max-w-full">Shipping Address</h2>
        <div class="flex gap-5 mt-9 w-full max-md:flex-wrap max-md:max-w-full">
          <h3 class="text-sm font-semibold leading-6 text-foreground">Address Alias 1</h3>
          <div
            v-if="props.shippingAddress.default"
            class="flex gap-1 items-center py-0.5 pr-1.5 pl-1 text-xs font-medium leading-none whitespace-nowrap bg-card border border-emerald-500 border-solid rounded-[100px] text-foreground"
          >
            <CheckIcon class="w-4 h-4 rounded-full text-slate-50 bg-green-600" />
            <span class="font-medium">Default</span>
          </div>
        </div>
        <p class="mt-2 text-sm font-medium leading-5 text-muted-foreground max-md:max-w-full">
          {{ props.shippingAddress.name1 }}
        </p>
        <p class="mt-2 text-sm font-medium leading-5 text-muted-foreground max-md:max-w-full">
          {{ props.shippingAddress.name2 }}
        </p>
        <p class="mt-2 text-sm font-medium leading-5 text-muted-foreground max-md:max-w-full">
          {{ props.shippingAddress.postcode }}, {{ props.shippingAddress.country }}
        </p>
      </div>
    </div>
    <div class="flex flex-col w-6/12 max-md:ml-0 max-md:w-full">
      <div class="flex flex-col px- text-sm font-medium leading-5 text-muted-foreground max-md:mt-9 max-md:max-w-full">
        <h2 class="text-base font-semibold leading-7 text-foreground max-md:max-w-full">Billing Address</h2>
        <p class="mt-9 max-md:max-w-full">
          {{ props.billingAddress.name1 }}
        </p>
        <p class="mt-2 max-md:max-w-full">
          {{ props.billingAddress.name2 }}
        </p>
        <p class="mt-2 max-md:max-w-full">{{ props.billingAddress.postcode }}, {{ props.billingAddress.country }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
