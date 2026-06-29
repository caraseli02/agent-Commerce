<template>
  <div :class="className" class="relative inline-block">
    <NuxtImg v-if="currentSrc !== 'fallback'" :src="currentSrc" :alt="alt" :class="mediaClass" loading="lazy" @error="handleError"/>
    <div
      v-else
      class="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200"
    >
      <!-- Subtle Background for Premium Look -->
      <div
        class="absolute inset-0 opacity-10 grayscale"
        style="
          background-image: url('https://images.unsplash.com/photo-1518770660439-4636190af475?w=400');
          background-size: cover;
          background-position: center;
        "
      />
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-slate-400 relative z-10">
        <path
          d="M9 3H15M9 21H15M20 7V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path d="M12 9V15M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
const attrs = useAttrs();

const props = defineProps({
  src: {
    type: String,
    required: false,
    default: null,
  },
  alt: {
    type: String,
    default: '',
  },
  className: {
    type: String,
    default: '',
  },
});

const mediaClass = computed(() => [props.className, attrs.class]);

const currentSrc = ref<string | 'fallback'>(props.src || 'fallback');

watch(
  () => props.src,
  (newSrc) => {
    currentSrc.value = newSrc || 'fallback';
  }
);

function handleError() {
  currentSrc.value = 'fallback';
}
</script>

<style scoped>
.full-size-svg {
  width: 100%;
  height: 100%;
}
</style>
