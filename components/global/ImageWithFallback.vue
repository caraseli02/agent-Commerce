<template>
  <div ref="rootRef" class="relative block min-h-0 min-w-0 overflow-hidden" :class="rootClass" v-bind="rootAttrs">
    <component
      :is="useOptimizedImage ? 'NuxtImg' : 'img'"
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
      class="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-light-200 ring-1 ring-inset ring-grey-200"
    >
      <Package class="h-[36%] w-[36%] min-h-8 min-w-8 max-h-12 max-w-12 text-slate-400" :stroke-width="1.5" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next';

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

const useOptimizedImage = computed(() => {
  if (currentSrc.value === 'fallback') {
    return false;
  }

  const src = currentSrc.value;
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');
});

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
