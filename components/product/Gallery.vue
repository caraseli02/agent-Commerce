<template>
  <div class="relative flex h-[298px] flex-col overflow-hidden rounded-xl bg-white p-3 shadow-m lg:h-full lg:p-3.5">
    <div class="absolute right-4 top-4 z-10 flex flex-col items-end gap-2 lg:right-5 lg:top-5">
      <button
        class="rounded-md bg-white/90 p-1.5 text-slate-400 shadow-sm ring-1 ring-slate-100/80 transition-colors duration-300 hover:text-blue-500"
        type="button"
        aria-label="Share"
      >
        <Share2Icon class="h-5 w-5 lg:h-5 lg:w-5" />
      </button>
      <button
        class="rounded-md bg-white/90 p-1.5 text-slate-400 shadow-sm ring-1 ring-slate-100/80 transition-colors duration-300 hover:text-blue-500"
        type="button"
        aria-label="Box"
      >
        <BoxIcon class="h-5 w-5 lg:h-5 lg:w-5" />
      </button>
    </div>

    <button
      type="button"
      class="flex min-h-0 w-full flex-1 items-stretch justify-stretch overflow-hidden rounded-lg bg-light-100"
      aria-label="Open product image gallery"
      @click="emit('showZoomModal')"
    >
      <ImageWithFallback
        :src="props.images[activeImageIndex]?.ProductImageLarge"
        alt="Product image"
        class-name="h-full w-full cursor-pointer object-contain lg:object-cover"
      />
    </button>

    <ul
      v-if="showMobileThumbs"
      class="mt-3 flex shrink-0 list-none gap-2 overflow-x-auto pb-0.5 lg:hidden"
      aria-label="Product image thumbnails"
    >
      <li v-for="(image, index) in images" :key="index" class="shrink-0">
        <button
          type="button"
          class="flex rounded-md ring-1 ring-inset ring-transparent transition-opacity duration-300"
          :class="index === activeImageIndex ? 'opacity-100 ring-blue-500' : 'opacity-50 hover:opacity-80'"
          :aria-label="`Show product image ${index + 1}`"
          :aria-pressed="index === activeImageIndex"
          @click="handleSlideTo(index)"
        >
          <ImageWithFallback
            :src="image?.ProductImageSmall"
            alt=""
            class-name="h-12 w-14 object-contain"
          />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { BoxIcon, Share2Icon } from 'lucide-vue-next';

import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import type { ProductDetail } from '~/model/products/response/ProductDetailResponse';
import type { ProductImageInterface } from '~/model/products/response/ProductResponse';

const props = defineProps<{
  images: ProductImageInterface[];
  product: ProductDetail;
}>();

const emit = defineEmits(['showZoomModal']);

const activeImageIndex = defineModel<number>({ default: 0 });

const showMobileThumbs = computed(() => props.images.length > 1);

const handleSlideTo = (index: number) => {
  activeImageIndex.value = index;
};
</script>
