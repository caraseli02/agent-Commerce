<template>
  <div class="flex items-center justify-between gap-4 mb-5 rounded-2xl border border-border bg-card px-4 py-4 shadow-xs md:px-5">
    <h1 class="text-xl font-semibold text-foreground">Order Summary</h1>
    <div class="flex items-center">
      <DialogReportError />
      <UiButton v-if="printable" variant="ghost" size="sm" aria-label="Print this page" @click="printPage">
        <Printer class="w-[22px] h-[22px]" />
        <span class="ml-[5px] max-md:hidden"> Print this page </span>
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Printer } from '@lucide/vue';

// Printing an empty cart has nothing to show, so the page hides the action then.
withDefaults(defineProps<{ printable?: boolean }>(), { printable: true });

const printPage = () => {
  if (import.meta.client) {
    window.print();
  }
};
</script>
