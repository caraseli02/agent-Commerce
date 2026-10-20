<template>
  <UiSheet :open="isOpen" @update:open="onOpenChange">
    <UiSheetContent
      side="bottom"
      hidde-close-button
      overlay-class-name="z-[70] bg-[#333333]/70 backdrop-blur-[2px]"
      class="z-[70] flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden rounded-t-[15px] border-none p-0 shadow-xs sm:max-w-none [&>button.fixed]:hidden"
    >
      <div v-touch:drag="onDrag" class="flex items-center justify-between px-5 py-5">
        <UiSheetTitle class="text-lg font-semibold text-muted-foreground tracking-[0.6px]">Filters</UiSheetTitle>
        <UiSheetClose as-child>
          <UiButton
            variant="ghost"
            size="icon"
            class="h-11 w-11 rounded bg-[#F2F2F2] text-muted-foreground hover:bg-[#F2F2F2] hover:text-muted-foreground"
            aria-label="Close filters"
          >
            <XIcon class="h-[15px] w-[15px]" />
          </UiButton>
        </UiSheetClose>
      </div>
      <div v-touch:drag="onDrag" class="mb-[25px] flex items-center gap-[15px] px-[15px]">
        <UiButton
          class="flex items-center justify-center rounded bg-blue-500 px-3 py-1.5 font-Inter text-sm font-medium text-white hover:bg-blue-500"
          @click="$emit('show-add-filters-modal')"
        >
          <FiltersIcon class="mr-2 h-5 w-5" />
          <span>Add Filters</span>
        </UiButton>
        <UiButton
          class="flex items-center justify-center rounded bg-blue-500 px-3 py-1.5 font-Inter text-sm font-medium text-white hover:bg-blue-500"
        >
          <ResetIcon class="mr-2 h-5 w-5" />
          <span>Reset Filters</span>
        </UiButton>
      </div>
      <div class="grid max-h-[340px] grid-cols-1 gap-1.5 overflow-auto px-[15px] pb-5 scrollbar-thin">
        <SearchFilter2 v-for="filter in 20" :id="filter" :key="filter" />
      </div>
    </UiSheetContent>
  </UiSheet>
</template>

<script setup lang="ts">
import XIcon from '@/assets/icons/x.svg';
import FiltersIcon from '@/assets/icons/filters.svg';
import ResetIcon from '@/assets/icons/reset.svg';

const MD_MIN_WIDTH_QUERY = '(min-width: 768px)';

const emits = defineEmits(['close', 'show-add-filters-modal']);

const isOpen = ref(true);

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

const onDrag = (event: { direction?: string }) => {
  if (event.direction === 'bottom') {
    closeModal();
  }
};

// Mobile-only sheet: closing on md+ releases Radix overlay + body scroll-lock.
// CSS md:hidden on content alone leaves the overlay mounted and blocks the page.
const mediaQuery = import.meta.client ? window.matchMedia(MD_MIN_WIDTH_QUERY) : null;

const closeWhenDesktop = (matches: boolean) => {
  if (matches && isOpen.value) {
    closeModal();
  }
};

const onBreakpointChange = (event: MediaQueryListEvent) => {
  closeWhenDesktop(event.matches);
};

onMounted(() => {
  if (!mediaQuery) {
    return;
  }

  closeWhenDesktop(mediaQuery.matches);
  mediaQuery.addEventListener('change', onBreakpointChange);
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', onBreakpointChange);
});
</script>
