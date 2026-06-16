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
// eslint-disable-next-line vue/require-prop-types
const isOpen = defineModel('open', { default: false });

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
  <UiDialog
    :open="isOpen"
    @update:open="isOpen = $event"
  >
    <UiDialogContent class="w-full max-w-sm md:max-w-3xl">
      <UiDialogHeader>
        <UiDialogTitle>{{ alias }}</UiDialogTitle>
      </UiDialogHeader>
      <div class="w-full mx-auto sm:w-auto">
        <UiCarousel
          class="relative w-full max-w-xl"
          @init-api="(val) => (emblaMainApi = val)"
        >
          <UiCarouselContent>
            <UiCarouselItem
              v-for="(_, index) in 10"
              :key="index"
            >
              <div class="rounded-lg border bg-background shadow-sm">
                <div class="flex aspect-square items-center justify-center p-4">
                  <ClientOnly>
                    <ProductZoomImg
                      :alias="alias"
                      :url="images[selectedIndex ?? 0]?.ProductImageLarge ?? ''"
                      alt="Image"
                      class="w-[260px] h-[250x] object-contain transition-opacity duration-300 lg:w-[356px] lg:h-[348px]"
                    />
                  </ClientOnly>
                </div>
              </div>
            </UiCarouselItem>
          </UiCarouselContent>
          <UiCarouselPrevious />
          <UiCarouselNext />
        </UiCarousel>

        <UiCarousel
          class="relative w-full max-w-xl mt-2"
          @init-api="(val) => (emblaThumbnailApi = val)"
        >
          <UiCarouselContent class="flex gap-1 ml-0">
            <UiCarouselItem
              v-for="(img, index) in images.map((item) => item.ProductImageSmall)"
              :key="index"
              class="pl-0 basis-1/4 cursor-pointer rounded flex justify-center items-center"
              @click="onThumbClick(index)"
            >
              <div
                class="p-1"
                :class="index === selectedIndex ? '' : 'opacity-50'"
              >
                <img
                  :src="img"
                  alt="Image"
                  class="w-[60px] h-[50x] object-contain transition-opacity duration-300 lg:w-[56px] lg:h-[48px]"
                  :class="[index !== selectedIndex ? 'opacity-50' : '']"
                >
              </div>
            </UiCarouselItem>
          </UiCarouselContent>
        </UiCarousel>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
