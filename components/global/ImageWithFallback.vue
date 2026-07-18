<template>
  <div ref="rootRef" class="relative block min-h-0 min-w-0 overflow-hidden" :class="rootClass" v-bind="rootAttrs">
    <NuxtImg
      v-if="currentSrc !== 'fallback'"
      :src="currentSrc"
      :alt="alt"
      :class="mediaClass"
      loading="lazy"
      @load="handleLoad"
      @error="handleError"
    />
    <div
      v-else
      role="img"
      :aria-label="alt || 'Product image unavailable'"
      class="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-white"
    >
      <!-- Full-bleed electronics texture so the placeholder fills the media frame -->
      <div
        class="absolute inset-0 scale-105 bg-cover bg-center opacity-[0.18] grayscale"
        style="background-image: url('https://images.unsplash.com/photo-1518770660439-4636190af475?w=400')"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-white/40 via-slate-50/30 to-slate-100/50" />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="relative z-10 h-[38%] w-[38%] min-h-9 min-w-9 max-h-16 max-w-16 text-slate-400"
        aria-hidden="true"
      >
        <path
          d="M9 3H15M9 21H15M20 7V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7Z"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
        />
        <rect x="8" y="9" width="8" height="6" rx="1" stroke="currentColor" stroke-width="1.75" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

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

const rootClass = computed(() => [props.className, attrs.class]);
const mediaClass = computed(() => [props.className, attrs.class]);
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs as Record<string, unknown>;
  return rest;
});
const rootRef = ref<HTMLElement | null>(null);

function normalizeImageSrc(src?: string | null) {
  const value = src?.trim();
  return value && !value.includes('not_valid_image') ? value : 'fallback';
}

const currentSrc = ref<string | 'fallback'>(normalizeImageSrc(props.src));

watch(
  () => props.src,
  async (newSrc) => {
    currentSrc.value = normalizeImageSrc(newSrc);
    await nextTick();
    checkImageHealth();
  }
);

onMounted(() => {
  checkImageHealth();
});

function checkImageHealth(image = rootRef.value?.querySelector('img')) {
  if (currentSrc.value === 'fallback' || !image || !image.complete) return;

  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    currentSrc.value = 'fallback';
  }
}

function handleLoad(event: Event) {
  checkImageHealth(event.target as HTMLImageElement);
}

function handleError() {
  currentSrc.value = 'fallback';
}
</script>
