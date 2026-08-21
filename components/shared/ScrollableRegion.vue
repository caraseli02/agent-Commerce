<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    label: string;
    class?: HTMLAttributes['class'];
    testId?: string;
    showScrollHint?: boolean;
    scrollHint?: string;
    scrollTargetSelector?: string;
  }>(),
  {
    class: undefined,
    testId: undefined,
    showScrollHint: false,
    scrollHint: 'Scroll to view more columns',
    scrollTargetSelector: undefined,
  },
);

const region = ref<HTMLElement | null>(null);
const scrollTarget = ref<HTMLElement | null>(null);
const hasHorizontalOverflow = ref(false);
const isAtHorizontalEnd = ref(true);
let resizeObserver: ResizeObserver | undefined;

const showHint = computed(() => props.showScrollHint && hasHorizontalOverflow.value && !isAtHorizontalEnd.value);

const updateScrollState = () => {
  const element = scrollTarget.value;
  if (!element) return;

  hasHorizontalOverflow.value = element.scrollWidth > element.clientWidth;
  isAtHorizontalEnd.value = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
};

onMounted(async () => {
  await nextTick();
  scrollTarget.value = props.scrollTargetSelector ? (region.value?.querySelector(props.scrollTargetSelector) ?? null) : region.value;
  updateScrollState();
  resizeObserver = new ResizeObserver(updateScrollState);
  if (scrollTarget.value) {
    resizeObserver.observe(scrollTarget.value);
    scrollTarget.value.addEventListener('scroll', updateScrollState);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  scrollTarget.value?.removeEventListener('scroll', updateScrollState);
});
</script>

<template>
  <div class="relative max-w-full">
    <div
      ref="region"
      :aria-label="label"
      :data-testid="testId"
      :class="
        cn(
          'max-w-full overflow-x-auto rounded-xl scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          props.class,
        )
      "
      role="region"
      tabindex="0"
      @scroll="updateScrollState"
    >
      <slot />
    </div>
    <p
      v-if="showHint"
      class="pointer-events-none absolute bottom-3 right-3 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg md:hidden"
      role="status"
    >
      {{ scrollHint }} →
    </p>
  </div>
</template>
