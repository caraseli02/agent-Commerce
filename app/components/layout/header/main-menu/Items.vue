<script setup lang="ts">
import DesktopPopover from './DesktopPopover.vue';
import MobileSheet from './MobileSheet.vue';
</script>

<template>
  <div class="hidden lg:block">
    <DesktopPopover />
  </div>
  <div class="lg:hidden">
    <ClientOnly>
      <MobileSheet />
    </ClientOnly>
  </div>
</template>
