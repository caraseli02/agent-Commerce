<template>
  <section
    class="flex flex-col items-center justify-center text-center"
    :class="[compact ? 'px-0 py-4' : 'px-4 py-10 md:py-14', variant === 'error' ? 'rounded-2xl border border-red-200 bg-red-50' : '']"
    :role="variant === 'error' ? 'alert' : 'status'"
    :aria-labelledby="resolvedHeadingId"
  >
    <component
      :is="illustration"
      v-if="variant === 'empty' && illustration"
      class="mb-5 shrink-0 text-slate-300"
      :class="compact ? 'h-16 w-16' : 'h-[120px] w-[120px]'"
      aria-hidden="true"
    />
    <h2 :id="resolvedHeadingId" class="font-semibold text-foreground" :class="compact ? 'text-base' : 'text-lg md:text-xl'">
      {{ heading }}
    </h2>
    <p v-if="description" class="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
      {{ description }}
    </p>
    <ul v-if="variant === 'empty' && suggestions?.length" class="mt-4 max-w-md space-y-1 text-left text-sm text-muted-foreground">
      <li v-for="suggestion in suggestions" :key="suggestion" class="flex gap-2">
        <span aria-hidden="true" class="text-slate-400">•</span>
        <span>{{ suggestion }}</span>
      </li>
    </ul>
    <div v-if="primaryLabel || secondaryLabel" class="mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
      <NuxtLink
        v-if="primaryTo"
        :to="primaryTo"
        class="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        @click="$emit('primary-click')"
      >
        {{ primaryLabel }}
      </NuxtLink>
      <UiButton v-else-if="primaryLabel" type="button" class="min-h-11" @click="$emit('primary-click')">
        {{ primaryLabel }}
      </UiButton>
      <NuxtLink
        v-if="secondaryTo"
        :to="secondaryTo"
        class="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-slate-300 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        @click="$emit('secondary-click')"
      >
        {{ secondaryLabel }}
      </NuxtLink>
      <UiButton v-else-if="secondaryLabel" type="button" variant="outline" class="min-h-11" @click="$emit('secondary-click')">
        {{ secondaryLabel }}
      </UiButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

const props = withDefaults(
  defineProps<{
    heading: string;
    description?: string;
    suggestions?: readonly string[];
    illustration?: Component;
    primaryLabel?: string;
    primaryTo?: string;
    secondaryLabel?: string;
    secondaryTo?: string;
    variant?: 'empty' | 'error';
    headingId?: string;
    compact?: boolean;
  }>(),
  {
    description: undefined,
    suggestions: undefined,
    illustration: undefined,
    primaryLabel: undefined,
    primaryTo: undefined,
    secondaryLabel: undefined,
    secondaryTo: undefined,
    variant: 'empty',
    headingId: undefined,
    compact: false,
  },
);

const generatedHeadingId = useId();
const resolvedHeadingId = computed(() => props.headingId ?? `empty-state-heading-${generatedHeadingId}`);

defineEmits<{
  'primary-click': [];
  'secondary-click': [];
}>();
</script>
