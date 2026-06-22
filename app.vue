<template>
  <UiTooltipProvider>
    <NuxtLayout>
      <NuxtPage id="nuxt_page" class="relative" />
    </NuxtLayout>
  </UiTooltipProvider>
  <LazyAppInfo v-model="appStore.showAppInBeta" />
</template>

<script setup lang="ts">
import { useAppStore } from '@/store/appStore';

const appStore = useAppStore();
</script>
