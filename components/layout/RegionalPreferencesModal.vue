<template>
  <div class="fixed z-[60] top-0 left-0-0 w-screen h-screen">
    <div class="relative z-10 flex flex-col ml-auto w-full h-full bg-white overflow-y-auto scrollbar-thin max-h-vh md:w-[450px]">
      <div class="flex items-center justify-between p-5 border-b border-gray-200 mb-5">
        <div class="flex items-center">
          <GlobeIcon class="w-7 h-7 mr-2" />
          <span class="text-lg font-semibold text-slate-500">Regional Preferences</span>
        </div>
        <button
          class="rounded w-8 h-8 bg-[#F2F2F2] flex items-center justify-center text-gray-500 transition-colors duration-300 hover:text-slate-500"
          @click="$emit('close')"
        >
          <XIcon class="w-[15px] h-[15px]" />
        </button>
      </div>
      <div class="px-5 mb-10">
        <div class="text-sm text-slate-500 mb-5">Select a language, shipping region and currency to update your experience on demo.app</div>
        <FormSelect
          v-model="language"
          label="Language"
          placeholder="Language"
          :options="[
            { value: 'english', label: 'English' },
            { value: 'romanian', label: 'Romanian' },
          ]"
          class="z-10 mb-5"
        />
        <FormSelect
          v-model="currency"
          label="Currency"
          placeholder="Currency"
          :options="[
            { value: 'ron', label: 'Lei' },
            { value: 'euro', label: 'EURO' },
            { value: 'usd', label: 'USD' },
          ]"
        />
      </div>
      <div class="flex items-center justify-center gap-2.5 mt-auto pb-[50px]">
        <button class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white" @click="$emit('close')">Save</button>
        <button class="flex bg-gray-100 rounded px-[26px] py-[11px] text-sm font-medium text-slate-500" @click="$emit('close')">
          Cancel
        </button>
      </div>
    </div>
    <div
      class="hidden absolute top-0 left-0 w-full h-full bg-[#333333]/70 backdrop-blur-[2px] cursor-pointer md:block"
      @click="$emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import XIcon from '@/assets/icons/x.svg';
import GlobeIcon from '@/assets/icons/globe.svg';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

defineEmits(['close']);

const regionalPreferencesStore = useRegionalPreferencesStore();
const { language, currency } = storeToRefs(regionalPreferencesStore);

onMounted(() => {
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
});
</script>
