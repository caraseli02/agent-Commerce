<template>
  <div class="fixed z-[70] bottom-0 left-0 w-screen flex items-end justify-end md:hidden">
    <div class="relative z-10 w-full py-5 bg-white rounded-t-[15px] shadow-xs md:px-5">
      <div v-touch:drag="onDrag" class="flex items-center justify-between px-5 mb-[30px]">
        <div class="text-lg font-semibold text-slate-500 tracking-[0.6px]">Filters</div>
        <button
          class="rounded w-8 h-8 bg-[#F2F2F2] flex items-center justify-center text-gray-500 transition-colors duration-300 hover:text-slate-500"
          @click="$emit('close')"
        >
          <XIcon class="w-[15px] h-[15px]" />
        </button>
      </div>
      <div v-touch:drag="onDrag" class="flex items-center gap-[15px] px-[15px] mb-[25px]">
        <button
          class="flex items-center justify-center bg-blue-500 text-white rounded px-3 py-1.5 text-sm font-medium font-Inter"
          @click="$emit('show-add-filters-modal')"
        >
          <FiltersIcon class="w-5 h-5 mr-2" />
          <span>Add Filters</span>
        </button>
        <button class="flex items-center justify-center bg-blue-500 text-white rounded px-3 py-1.5 text-sm font-medium font-Inter">
          <ResetIcon class="w-5 h-5 mr-2" />
          <span>Reset Filters</span>
        </button>
      </div>
      <div class="grid grid-cols-1 gap-1.5 overflow-auto max-h-[340px] scrollbar-thin px-[15px]">
        <SearchFilter2 v-for="filter in 20" :id="filter" :key="filter" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import XIcon from '@/assets/icons/x.svg';
import FiltersIcon from '@/assets/icons/filters.svg';
import ResetIcon from '@/assets/icons/reset.svg';

const emits = defineEmits(['close', 'show-add-filters-modal']);

const onDrag = (event: { direction?: string }) => {
  if (event.direction === 'bottom') {
    emits('close');
  }
};

onMounted(() => {
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
});
</script>
