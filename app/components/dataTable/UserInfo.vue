<template>
  <NuxtLink
    v-if="navigateToRoute"
    :to="navigateToRoute"
    class="flex min-w-[228px] flex-col rounded-md py-1 text-start text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
  >
    <span class="text-sm font-medium">{{ name }}</span>
    <span class="text-xs font-normal">{{ email }}</span>
  </NuxtLink>
  <div v-else class="flex min-w-[228px] flex-col py-1 text-start text-foreground">
    <span class="text-sm font-medium">{{ name }}</span>
    <span class="text-xs font-normal">{{ email }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  email: string;
  navigateToRoute?: string;
}>();
</script>
