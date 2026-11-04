<template>
  <div ref="rootRef" class="relative block min-h-0 min-w-0 overflow-hidden" :class="rootClass" v-bind="rootAttrs">
    <component
      :is="imageComponent"
      v-if="currentSrc !== 'fallback'"
      :src="currentSrc"
      :alt="alt"
      :class="mediaClass"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      :sizes="sizes"
      :width="width"
      :height="height"
      @load="handleLoad"
      @error="handleError"
    />
    <div
      v-else
      role="img"
      :aria-label="alt || 'Product image unavailable'"
      class="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-muted bg-dot-grid ring-1 ring-inset ring-border"
    >
      <!-- A datasheet-style placeholder: the package glyph on a plate over a dot grid. -->
      <span
        class="flex aspect-square w-[42%] max-w-20 min-w-12 items-center justify-center rounded-xl bg-card shadow-xs ring-1 ring-border"
      >
        <Package class="h-[52%] w-[52%] text-slate-400" :stroke-width="1.5" aria-hidden="true" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Package } from '@lucide/vue';

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
  /** Above-the-fold image (LCP candidate): load eagerly with high fetch priority. */
  priority: {
    type: Boolean,
    default: false,
  },
  sizes: {
    type: String,
    default: undefined,
  },
  /** Intrinsic dimensions reserve the aspect ratio before the file arrives. */
  width: {
    type: [Number, String],
    default: undefined,
  },
  height: {
    type: [Number, String],
    default: undefined,
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

  // Data/blob URIs cannot be processed by the image optimizer.
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return false;
  }

  // Vite-bundled assets are emitted as hashed /_nuxt/* files that IPX cannot read
  // from disk during prerender, so they stay on a native <img>.
  if (src.startsWith('/_nuxt/')) {
    return false;
  }

  // Only optimize known-safe shapes: remote URLs and absolute site/public paths.
  // Ambiguous relative paths and unsupported schemes stay on native <img>.
  return /^https?:\/\//i.test(src) || src.startsWith('//') || src.startsWith('/');
});

// Resolve the real component: a plain 'NuxtImg' string does not resolve to the
// registered component in a dynamic <component :is>, so it silently renders a
// custom element and skips optimization entirely.
const imageComponent = computed(() => (useOptimizedImage.value ? resolveComponent('NuxtImg') : 'img'));

watch(
  () => props.src,
  async (newSrc) => {
    currentSrc.value = normalizeImageSrc(newSrc);
    await nextTick();
    checkImageHealth();
  },
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
