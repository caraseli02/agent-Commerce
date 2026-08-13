<template>
  <UiSheet :open="isOpen" @update:open="onOpenChange">
    <UiSheetContent
      side="right"
      hidde-close-button
      overlay-class-name="z-[60] bg-[#333333]/70 backdrop-blur-[2px]"
      class="z-[60] flex h-full w-full max-w-none flex-col gap-0 overflow-y-auto border-none p-0 shadow-none scrollbar-thin md:w-[450px] sm:max-w-none [&>button.fixed]:hidden"
    >
      <div class="flex items-center justify-between border-b border-gray-200 p-5">
        <div class="flex items-center">
          <GlobeIcon class="mr-2 h-7 w-7" />
          <UiSheetTitle class="text-lg font-semibold text-slate-500">Regional Preferences</UiSheetTitle>
        </div>
        <UiSheetClose as-child>
          <UiButton
            variant="ghost"
            size="icon"
            class="inline-flex h-8 w-8 flex-shrink-0 rounded bg-[#F2F2F2] text-gray-500 hover:bg-[#F2F2F2] hover:text-slate-500"
            aria-label="Close regional preferences"
          >
            <XIcon class="h-5 w-5" />
          </UiButton>
        </UiSheetClose>
      </div>

      <div class="mb-10 px-5">
        <p class="mb-5 text-sm text-slate-500">
          Choose a demo currency to preview pricing labels on demo.app. This portfolio build does not include locale translation —
          storefront copy stays in English.
        </p>
        <FormSelect
          v-model="currency"
          label="Demo currency"
          placeholder="Currency"
          :options="[
            { value: 'ron', label: 'Lei' },
            { value: 'euro', label: 'EURO' },
            { value: 'usd', label: 'USD' },
          ]"
        />
      </div>

      <div class="mt-auto flex items-center justify-center gap-2.5 pb-[50px]">
        <UiButton class="px-[34px] py-[11px]" @click="closeModal">Save</UiButton>
        <UiButton variant="secondary" class="px-[26px] py-[11px] text-slate-500" @click="closeModal">Cancel</UiButton>
      </div>
    </UiSheetContent>
  </UiSheet>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import XIcon from '@/assets/icons/x.svg';
import GlobeIcon from '@/assets/icons/globe.svg';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

const emits = defineEmits(['close']);

const isOpen = ref(true);
const regionalPreferencesStore = useRegionalPreferencesStore();
const { currency } = storeToRefs(regionalPreferencesStore);

const closeModal = () => {
  isOpen.value = false;
  emits('close');
};

const onOpenChange = (open: boolean) => {
  isOpen.value = open;

  if (!open) {
    emits('close');
  }
};
</script>
