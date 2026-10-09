<template>
  <div class="relative flex h-[298px] flex-col overflow-hidden rounded-xl bg-white p-3 shadow-m lg:h-full lg:p-3.5">
    <div class="absolute right-4 top-4 z-10 flex flex-col items-end gap-2 lg:right-5 lg:top-5">
      <button
        class="flex h-11 w-11 items-center justify-center rounded-md bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-100/80 transition-colors duration-200 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        type="button"
        aria-label="Share product"
        @click="shareProduct"
      >
        <Share2Icon class="h-5 w-5" />
      </button>
      <button
        class="flex h-11 w-11 items-center justify-center rounded-md bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-100/80 transition-colors duration-200 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        type="button"
        aria-label="View 3D preview"
        @click="showPreviewModal = true"
      >
        <BoxIcon class="h-5 w-5" />
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
        :alt="`${props.product.name || props.product.alias || 'Product'} image`"
        class-name="h-full w-full cursor-pointer object-contain"
      />
    </button>

    <ul v-if="showThumbnails" class="mt-3 flex shrink-0 list-none gap-2 overflow-x-auto pb-0.5" aria-label="Product image thumbnails">
      <li v-for="(image, index) in images" :key="index" class="shrink-0">
        <button
          type="button"
          class="flex rounded-md ring-1 ring-inset ring-transparent transition-opacity duration-300"
          :class="index === activeImageIndex ? 'opacity-100 ring-blue-500' : 'opacity-50 hover:opacity-80'"
          :aria-label="`Show product image ${index + 1}`"
          :aria-pressed="index === activeImageIndex"
          @click="handleSlideTo(index)"
        >
          <ImageWithFallback :src="image?.ProductImageSmall" alt="" class-name="h-12 w-14 object-contain" />
        </button>
      </li>
    </ul>

    <UiDialog v-model:open="showPreviewModal">
      <UiDialogContent class="max-w-md">
        <UiDialogHeader>
          <UiDialogTitle>3D preview</UiDialogTitle>
          <UiDialogDescription>
            A 3D view is not available for this product yet. You can still inspect its photos in the image gallery.
          </UiDialogDescription>
        </UiDialogHeader>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { BoxIcon, Share2Icon } from '@lucide/vue';
import { toast } from '@/components/ui/toast';

import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import type { ProductDetail, ProductImageInterface } from '~~/types/product';

const props = defineProps<{
  images: ProductImageInterface[];
  product: ProductDetail;
}>();

const emit = defineEmits(['showZoomModal']);

const activeImageIndex = defineModel<number>({ default: 0 });
const showPreviewModal = ref(false);

const showThumbnails = computed(() => props.images.length > 1);

const handleSlideTo = (index: number) => {
  activeImageIndex.value = index;
};

const shareProduct = async () => {
  if (!import.meta.client) return;

  const url = window.location.href;
  const title = props.product.name || props.product.alias || 'Product';

  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    toast({ title: 'Product link copied', description: 'Share this link to open the product.' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;

    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Product link copied', description: 'Share this link to open the product.' });
    } catch {
      toast({
        title: 'Could not share product',
        description: 'Copy the product link from your browser address bar.',
        variant: 'warning',
      });
    }
  }
};
</script>
