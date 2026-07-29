<script setup lang="ts">
import { XIcon, MenuIcon } from 'lucide-vue-next';
import PopoverContainer from './DektopPopoverContainer.vue';
import { useCategoriesNavigation } from '@/composables/useCategoriesNavigation';

const { isOpen } = useCategoriesNavigation();
const wrapperRef = ref<HTMLElement | null>(null);
const popoverTop = ref(0);

const togglePopover = () => {
  isOpen.value = !isOpen.value;
};

const closePopover = () => {
  isOpen.value = false;
};

const updatePopoverTop = () => {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  popoverTop.value = Math.max(0, rect.bottom + 15);
};

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      updatePopoverTop();
    });
  }
});

onMounted(() => {
  updatePopoverTop();
  window.addEventListener('resize', updatePopoverTop, { passive: true });
  window.addEventListener('scroll', updatePopoverTop, { passive: true });
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updatePopoverTop);
    window.removeEventListener('scroll', updatePopoverTop);
  }
});
</script>

<template>
  <div ref="wrapperRef" v-click-outside="closePopover" class="relative hidden font-Poppins lg:block">
    <UiButton
      :variant="isOpen ? 'secondary' : 'ghost'"
      class="mr-4 flex items-center md:mr-0"
      :class="{ 'text-primary-foreground hover:bg-white/10': !isOpen }"
      @click="togglePopover"
    >
      <XIcon v-if="isOpen" class="h-6 w-6" />
      <MenuIcon v-else class="h-6 w-6" />
      <span class="ml-2 hidden font-medium leading-normal md:inline-block lg:ml-4">Products</span>
    </UiButton>
    <div v-if="isOpen" class="fixed left-0 z-50 w-screen" :style="{ top: `${popoverTop}px` }">
      <PopoverContainer class="container" />
    </div>
  </div>
</template>
