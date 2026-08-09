<template>
  <div class="flex flex-col h-full min-h-screen overflow-y-auto app-scroll">
    <DashboardHeader :is-collapsed-on-desktop="isSideNavCollapsedOnDesktop" @show-side-nav="showSideNav = true" />
    <transition name="slide-from-left">
      <DashboardAside v-if="showSideNav" class="w-full md:hidden" @close="showSideNav = false" />
    </transition>
    <DashboardAside
      class="w-[280px] max-md:hidden md:z-30 md:transition-all md:duration-300 md:delay-50"
      :class="[isSideNavCollapsedOnDesktop ? 'md:w-[96px]' : 'md:w-[280px]']"
      :is-collapsed-on-desktop="isSideNavCollapsedOnDesktop"
      @close="isSideNavCollapsedOnDesktop = !isSideNavCollapsedOnDesktop"
    />
    <main
      class="pt-[68px] flex-1 transition-all duration-300 flex flex-col justify-between md:pt-[76px] md:ml-[96px] md:max-w-[calc(100vw-96px)]"
      :class="[isSideNavCollapsedOnDesktop ? '' : '2xl:ml-[280px] 2xl:max-w-[calc(100vw-280px)]']"
    >
      <slot />
      <div class="flex justify-center text-center text-xs leading-normal text-slate-500 mt-2 mb-6 md:mt-0">
        Components Marketplace portfolio demo — mock mode for reviewer walkthroughs
      </div>
    </main>
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from '@/components/ui/toast';

const isSideNavCollapsedOnDesktop = ref(true);
const showSideNav = ref(false);
</script>

<style lang="postcss">
html,
body,
div#__nuxt {
  @apply h-full;
}

.app-scroll {
  @apply scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-300;
}
</style>
