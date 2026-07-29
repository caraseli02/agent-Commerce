<template>
  <NuxtErrorBoundary @error="onBoundaryError">
    <slot />
    <template #error="{ error, clearError }">
      <div
        role="alert"
        class="flex flex-col items-center justify-center rounded-lg border border-rose-100 bg-rose-50 px-4 py-6 text-center"
        :data-dashboard-widget-boundary="widgetId"
      >
        <WarningIcon class="mb-3 h-8 w-8 text-rose-500" />
        <p class="text-sm font-semibold text-slate-700">{{ title }} couldn&apos;t load</p>
        <p class="mt-1 text-xs text-slate-500">Other dashboard areas remain available.</p>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <UiButton size="sm" variant="outline" @click="clearError">Try again</UiButton>
          <UiButton v-if="recoveryHref" size="sm" variant="ghost" as-child>
            <NuxtLink :to="recoveryHref">{{ recoveryLabel }}</NuxtLink>
          </UiButton>
        </div>
        <p v-if="error?.message" class="mt-3 max-w-full truncate text-[11px] text-slate-400" :title="error.message">
          {{ error.message }}
        </p>
      </div>
    </template>
  </NuxtErrorBoundary>
</template>

<script setup lang="ts">
import WarningIcon from '@/assets/icons/dashboard/warning.svg';

const props = withDefaults(
  defineProps<{
    title: string;
    widgetId: string;
    recoveryHref?: string;
    recoveryLabel?: string;
  }>(),
  {
    recoveryHref: '/dashboard/customers',
    recoveryLabel: 'Back to customers',
  }
);

const onBoundaryError = (error: unknown) => {
  if (import.meta.dev) {
    console.error(`[DashboardWidgetBoundary:${props.widgetId}]`, error);
  }
};
</script>
