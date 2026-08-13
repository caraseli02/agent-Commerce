<template>
  <div
    v-click-outside="() => (showTooltipContent = false)"
    class="relative"
    @click="showTooltipContent = true"
    @mouseenter="showTooltipContent = true"
    @mouseleave="showTooltipContent = false"
  >
    <slot />
    <Transition name="fade">
      <div
        v-if="showTooltipContent"
        class="absolute z-10 rounded-lg px-3 py-1 text-sm tracking-[-0.02em] leading-[1.43] font-Inter text-white min-w-max"
        :class="[
          position === 'left'
            ? 'top-1/2 -left-2 -translate-x-full -translate-y-1/2'
            : position === 'top'
              ? '-top-2 left-1/2 -translate-x-1/2 -translate-y-full'
              : position === 'bottom'
                ? '-bottom-2 translate-y-full left-1/2 -translate-x-1/2'
                : '',
          theme === 'gray' ? 'bg-slate-500' : 'bg-[#1B1B28]',
        ]"
      >
        <slot name="content">
          {{ text }}
        </slot>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 11 16"
          class="absolute w-[18px] h-3"
          :class="[
            position === 'left'
              ? 'top-1/2 -right-3 -translate-y-1/2'
              : position === 'top'
                ? '-bottom-2 left-1/2 -translate-x-1/2 rotate-90'
                : position === 'bottom'
                  ? '-top-2 left-1/2 -translate-x-1/2 -rotate-90'
                  : '',
          ]"
        >
          <path
            :fill="theme === 'gray' ? '#5E6278' : '#1B1B28'"
            d="M9.867 6.4a2 2 0 0 1 0 3.2l-6.667 5c-1.318.989-3.2.048-3.2-1.6V3C0 1.352 1.882.411 3.2 1.4l6.667 5Z"
          />
        </svg>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  position: {
    type: String as PropType<'left' | 'top' | 'bottom'>,
    required: false,
    default: 'left',
  },
  theme: {
    type: String as PropType<'gray' | 'black'>,
    required: false,
    default: 'gray',
  },
  text: {
    type: String,
    required: false,
    default: '',
  },
});

const showTooltipContent = ref(false);
</script>
