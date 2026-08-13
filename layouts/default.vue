<template>
  <div class="app-scroll flex min-h-screen flex-col">
    <LayoutHeader />
    <main class="flex flex-1 flex-col pt-[var(--mobile-header-height,100px)] md:pt-[110px]">
      <slot />
    </main>
    <LayoutFooter />
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { _debounce } from '#imports';
import { Toaster } from '@/components/ui/toast';

const calcViewportHeight = () => {
  if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    window.addEventListener(
      'resize',
      _debounce(function () {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }, 100),
    );
    window.addEventListener(
      'orientationchange',
      _debounce(function () {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }, 100),
    );
  }
};

onMounted(() => {
  calcViewportHeight();
  document.addEventListener('touchstart', function () {}, true);
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
