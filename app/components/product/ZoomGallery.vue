<script setup lang="ts">
import { ref } from 'vue';
import { watchOnce } from '@vueuse/core';
import type { CarouselApi } from '@/components/ui/carousel';

defineProps<{
  images: { ProductImageLarge: string; ProductImageSmall: string }[];
  alias: string;
}>();

const emblaMainApi = ref<CarouselApi>();
const emblaThumbnailApi = ref<CarouselApi>();

const selectedIndex = defineModel<number>('selectedIndex');

const isOpen = defineModel<boolean>('open', { default: false });

// The lazy dialog has no DialogTrigger; retain the button that requested it.
const opener = import.meta.client ? document.activeElement : null;

function restoreFocus(event: Event) {
  if (opener instanceof HTMLElement && opener.isConnected) {
    event.preventDefault();
    opener.focus();
  }
}

function onSelect() {
  if (!emblaMainApi.value || !emblaThumbnailApi.value) return;
  selectedIndex.value = emblaMainApi.value.selectedScrollSnap();
  emblaThumbnailApi.value.scrollTo(emblaMainApi.value.selectedScrollSnap());
}

function onThumbClick(index: number) {
  if (!emblaMainApi.value || !emblaThumbnailApi.value) return;
  emblaMainApi.value.scrollTo(index);
}

watchOnce(emblaMainApi, (emblaMainApi) => {
  if (!emblaMainApi) return;

  // onSelect()
  emblaMainApi.on('select', onSelect);
  emblaMainApi.on('reInit', onSelect);
});

onMounted(() => {
  if (selectedIndex.value) {
    emblaThumbnailApi.value?.scrollTo(selectedIndex.value);
  }
});
</script>

<template>
  <UiDialog :open="isOpen" @update:open="isOpen = $event">
    <UiDialogContent class="w-full max-w-sm md:max-w-3xl" @close-auto-focus="restoreFocus">
      <UiDialogHeader>
        <UiDialogTitle>{{ alias }}</UiDialogTitle>
        <UiDialogDescription class="sr-only">Browse product images and use the mouse wheel to zoom.</UiDialogDescription>
      </UiDialogHeader>
      <div class="w-full mx-auto sm:w-auto">
        <UiCarousel :opts="{ startIndex: selectedIndex ?? 0 }" class="relative w-full max-w-xl" @init-api="(val) => (emblaMainApi = val)">
          <UiCarouselContent>
            <UiCarouselItem
              v-for="(image, index) in images.length ? images : [{ ProductImageLarge: '', ProductImageSmall: '' }]"
              :key="index"
            >
              <div class="rounded-lg border bg-background shadow-sm">
                <div class="flex aspect-square items-center justify-center p-4">
                  <ClientOnly>
                    <ProductZoomImg
                      :alias="alias"
                      :url="image.ProductImageLarge"
                      :alt="`${alias} product image`"
                      class="h-[250px] w-[260px] object-contain transition-opacity duration-300 lg:h-[348px] lg:w-[356px]"
                    />
                  </ClientOnly>
                </div>
              </div>
            </UiCarouselItem>
          </UiCarouselContent>
          <UiCarouselPrevious />
          <UiCarouselNext />
        </UiCarousel>

        <UiCarousel class="relative w-full max-w-xl mt-2" @init-api="(val) => (emblaThumbnailApi = val)">
          <UiCarouselContent class="flex gap-1 ml-0">
            <UiCarouselItem v-for="(image, index) in images" :key="index" class="pl-0 basis-1/4 rounded flex justify-center items-center">
              <button
                type="button"
                class="cursor-pointer rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="index === selectedIndex ? '' : 'opacity-50'"
                :aria-label="`Show product image ${index + 1}`"
                :aria-pressed="index === selectedIndex"
                @click="onThumbClick(index)"
              >
                <ImageWithFallback
                  :src="image.ProductImageSmall"
                  :alt="`${alias} product thumbnail`"
                  class-name="w-[60px] h-[50px] object-contain transition-opacity duration-300 lg:w-[56px] lg:h-[48px]"
                  :class="[index !== selectedIndex ? 'opacity-50' : '']"
                />
              </button>
            </UiCarouselItem>
          </UiCarouselContent>
        </UiCarousel>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
