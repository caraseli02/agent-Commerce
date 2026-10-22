<template>
  <div class="flex flex-row">
    <div v-if="stockItem && !shortStock" class="flex flex-row items-center">
      <GreenCheckCircleSmall />
      <span class="ml-2 text-green-700 dark:text-green-400 text-xs font-medium leading-4">{{ stock }} in stock</span>
    </div>
    <div v-if="stockItem && shortStock" class="flex flex-row items-center">
      <OrangeCheckCircleSmall />
      <span class="ml-2 text-amber-700 dark:text-amber-400 text-xs font-medium leading-4">{{ stock }} in stock</span>
    </div>
    <div v-if="!stockItem" class="flex flex-row items-center">
      <WarningError />
      <span class="ml-2 text-red-700 dark:text-red-400 text-xs font-medium leading-4">Out of stock</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import GreenCheckCircleSmall from '@/assets/icons/green-check-circle-small.svg';
import OrangeCheckCircleSmall from '@/assets/icons/orange-check-circle-small.svg';
import WarningError from '@/assets/icons/warning-error.svg';

defineProps({
  stockItem: Boolean,
  shortStock: Boolean,
  stock: {
    type: Number,
    default: undefined,
  },
});
</script>
