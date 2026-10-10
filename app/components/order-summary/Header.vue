<template>
  <div class="flex items-center justify-between gap-4 mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xs md:px-5">
    <h1 class="text-xl font-semibold text-slate-900">Order Summary</h1>
    <div class="flex items-center">
      <DialogReportError />
      <button class="flex items-center text-gray-500 transition-colors duration-300 hover:text-blue-500" @click="printPage">
        <Printer class="w-[22px] h-[22px]" />
        <span class="text-xs leading-tight ml-[5px] max-md:hidden"> Print this page </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Printer } from '@lucide/vue';

const printPage = () => {
  if (import.meta.client) {
    window.print();
  }
};
</script>
