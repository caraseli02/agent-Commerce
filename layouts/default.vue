<template>
  <div class="flex flex-col min-h-screen app-scroll">
    <LayoutHeader :is-scrolled="isScrolled" />
    <main class="flex flex-col pt-[96px] flex-1 lg:pt-[180px] xl:pt-[176px]" :class="[isScrolled ? 'md:pt-[170px]' : 'md:pt-[172px]']">
      <slot />
    </main>
    <div
      v-if="$config.public.MOCK_MODE"
      class="fixed bottom-4 right-4 bg-blue-500/90 text-white px-3 py-1 rounded-md text-xs font-medium z-50 pointer-events-none select-none"
    >
      MOCK MODE
    </div>
    <LayoutFooter />
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { _debounce } from '#imports';
import { Toaster } from '@/components/ui/toast';

const isScrolled = ref(false);

const handleScroll = () => {
  if (window.scrollY) {
    isScrolled.value = true;
  } else {
    isScrolled.value = false;
  }
};

const calcViewportHeight = () => {
  if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    window.addEventListener(
      'resize',
      _debounce(function () {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }, 100)
    );
    window.addEventListener(
      'orientationchange',
      _debounce(function () {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }, 100)
    );
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  calcViewportHeight();
  document.addEventListener('touchstart', function () {}, true);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll);
  }
});
</script>

<style lang="postcss">
html,
body,
div#__nuxt {
  @apply h-full;
}

.app-scroll {
  @apply scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-w-1 scrollbar scrollbar-thumb-slate-500 scrollbar-track-slate-300;
}
</style>
