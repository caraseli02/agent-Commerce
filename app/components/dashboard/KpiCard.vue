<template>
  <div class="flex min-w-0 flex-col justify-between rounded-xl bg-card p-4 shadow-xs" :data-kpi="label">
    <div class="flex items-center justify-between gap-2">
      <span class="min-w-0 text-sm font-medium leading-snug text-muted-foreground">{{ label }}</span>
      <component :is="icon" v-if="icon && !error" class="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </div>
    <div class="mt-2 flex items-end justify-between gap-3">
      <template v-if="loading">
        <UiSkeleton class="h-8 w-24" />
      </template>
      <p v-else-if="error || value === null || value === undefined" class="text-sm font-medium text-muted-foreground">No data available</p>
      <p v-else class="min-w-0 break-words text-xl font-semibold leading-tight tabular-nums text-foreground sm:text-2xl">{{ value }}</p>
      <slot />
    </div>
    <p v-if="note" class="mt-2 text-xs text-muted-foreground">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  label: string;
  value?: string | number | null;
  note?: string;
  icon?: Component;
  loading?: boolean;
  error?: boolean;
}>();
</script>
