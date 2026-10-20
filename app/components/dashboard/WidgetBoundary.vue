<template>
  <div class="h-full w-full">
    <NuxtErrorBoundary @error="onBoundaryError">
      <slot />
      <template #error="{ error, clearError }">
        <div
          role="alert"
          class="flex h-full min-h-[11rem] w-full flex-col items-center justify-center rounded-xl bg-card p-4 text-center shadow-xs md:p-6"
          :data-dashboard-widget-boundary="widgetId"
        >
          <WarningIcon class="mb-3 h-8 w-8 text-slate-400" />
          <p class="text-sm font-semibold text-foreground">{{ title }} couldn&apos;t load</p>
          <p class="mt-1 text-xs text-muted-foreground">Other dashboard areas remain available.</p>
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
  </div>
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
  },
);

const onBoundaryError = (error: unknown) => {
  if (import.meta.dev) {
    console.error(`[DashboardWidgetBoundary:${props.widgetId}]`, error);
  }
};
</script>
