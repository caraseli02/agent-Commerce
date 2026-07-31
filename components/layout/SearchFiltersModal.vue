<template>
  <UiSheet :open="isOpen" @update:open="onOpenChange">
    <UiSheetContent
      side="bottom"
      hidde-close-button
      overlay-class-name="z-[70] bg-[#333333]/70 backdrop-blur-[2px]"
      class="z-[70] flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden rounded-t-[15px] border-none p-0 shadow-xs md:hidden sm:max-w-none [&>button.fixed]:hidden"
    >
      <div v-touch:drag="onDrag" class="flex items-center justify-between px-5 py-5">
        <UiSheetTitle class="text-lg font-semibold text-slate-500 tracking-[0.6px]">Filters</UiSheetTitle>
        <UiSheetClose as-child>
          <UiButton
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded bg-[#F2F2F2] text-gray-500 hover:bg-[#F2F2F2] hover:text-slate-500"
            aria-label="Close filters"
          >
            <XIcon class="w-[15px] h-[15px]" />
          </UiButton>
        </UiSheetClose>
      </div>
      <div v-touch:drag="onDrag" class="flex items-center gap-[15px] px-[15px] mb-[25px]">
        <UiButton
          class="flex items-center justify-center bg-blue-500 text-white rounded px-3 py-1.5 text-sm font-medium font-Inter hover:bg-blue-500"
          @click="$emit('show-add-filters-modal')"
        >
          <FiltersIcon class="w-5 h-5 mr-2" />
          <span>Add Filters</span>
        </UiButton>
        <UiButton class="flex items-center justify-center bg-blue-500 text-white rounded px-3 py-1.5 text-sm font-medium font-Inter hover:bg-blue-500">
          <ResetIcon class="w-5 h-5 mr-2" />
          <span>Reset Filters</span>
        </UiButton>
      </div>
      <div class="grid grid-cols-1 gap-1.5 overflow-auto max-h-[340px] scrollbar-thin px-[15px] pb-5">
        <SearchFilter2 v-for="filter in 20" :id="filter" :key="filter" />
      </div>
    </UiSheetContent>
  </UiSheet>
</template>

<script setup lang="ts">
import XIcon from '@/assets/icons/x.svg';
import FiltersIcon from '@/assets/icons/filters.svg';
import ResetIcon from '@/assets/icons/reset.svg';

const emits = defineEmits(['close', 'show-add-filters-modal']);

const isOpen = ref(true);

const onOpenChange = (open: boolean) => {
  isOpen.value = open;

  if (!open) {
    emits('close');
  }
};

const onDrag = (event: { direction?: string }) => {
  if (event.direction === 'bottom') {
    isOpen.value = false;
    emits('close');
  }
};
</script>
