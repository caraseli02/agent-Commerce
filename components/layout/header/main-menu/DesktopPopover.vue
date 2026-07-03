<script setup lang="ts">
import { XIcon, MenuIcon } from 'lucide-vue-next';
import PopoverContainer from './DektopPopoverContainer.vue';
import { useCategoriesNavigation } from '@/composables/useCategoriesNavigation';

defineProps<{ isScrolled: boolean }>();

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
  <div ref="wrapperRef" v-click-outside="closePopover" class="relative hidden lg:block font-Poppins">
    <UiButton
      :variant="isOpen || !isScrolled ? 'secondary' : 'ghost'"
      class="flex items-center mr-4 md:mr-0"
      :class="[{ 'text-primary-foreground hover:bg-white/10': !isOpen && isScrolled }, { 'text-slate-700': !isScrolled }]"
      @click="togglePopover"
    >
      <XIcon v-if="isOpen" class="w-6 h-6" />
      <MenuIcon v-else class="w-6 h-6" />
      <span v-if="!isScrolled" class="hidden leading-normal font-medium ml-2 md:inline-block lg:ml-4">Products</span>
    </UiButton>
    <div v-if="isOpen" class="fixed left-0 z-50 w-screen" :style="{ top: `${popoverTop}px` }">
      <PopoverContainer class="container" />
    </div>
  </div>
</template>
