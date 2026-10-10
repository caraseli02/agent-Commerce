<script setup lang="ts">
import type { OrderInterface } from '~~/types';

defineProps<{
  order: OrderInterface;
}>();

const isOpen = defineModel<boolean>();
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="w-full max-w-7xl pt-0 pr-10">
      <OrderTracking :order="order" class="border-none pt-4" />
    </UiDialogContent>
  </UiDialog>
</template>
