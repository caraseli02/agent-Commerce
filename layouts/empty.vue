<template>
  <div class="app-scroll">
    <main>
      <slot />
    </main>
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { Toaster } from '@/components/ui/toast';

const calcViewportHeight = () => {
  if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    window.addEventListener(
      'resize',
      _.debounce(function () {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }, 100)
    );
    window.addEventListener(
      'orientationchange',
      _.debounce(function () {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }, 100)
    );
  }
};

onMounted(() => {
  calcViewportHeight();
});
</script>

<style lang="postcss">
.app-scroll {
  @apply scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-700 scrollbar-track-slate-300;
}
</style>
