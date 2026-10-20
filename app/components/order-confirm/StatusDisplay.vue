<template>
  <div class="flex overflow-hidden gap-2 justify-center items-center self-stretch whitespace-nowrap rounded-md text-foreground">
    <span :class="statusColor" class="flex shrink-0 self-stretch my-auto w-3 h-3 rounded-full" aria-hidden="true" />
    <span class="capitalize">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  statusText: string;
  statusColor: string;
}>();
</script>

<style scoped></style>
