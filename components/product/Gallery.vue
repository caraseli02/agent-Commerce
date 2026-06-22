<template>
  <div class="relative bg-white rounded-xl shadow-m h-[298px] p-4 pt-7">
    <div class="grid h-full grid-cols-[1fr_auto] gap-3">
      <div class="flex min-w-0 flex-col justify-between">
        <button type="button" class="flex w-full justify-center" @click="emit('showZoomModal')">
          <ImageWithFallback
            :src="props.images[activeImageIndex]?.ProductImageLarge"
            alt="Product image"
            class-name="w-[284px] h-[160px] object-contain mx-auto lg:w-[330px] xl:w-[350px] cursor-pointer"
          />
        </button>
        <Swiper
          :modules="[A11y, Zoom]"
          :slides-per-view="4.5"
          :space-between="15"
          :grab-cursor="true"
          :zoom="true"
          :breakpoints="{
            1024: {
              slidesPerView: 5.1,
            },
            1280: {
              slidesPerView: 9.1,
            },
          }"
          class="productGallery--swiper w-full !pb-2"
        >
          <SwiperSlide
            v-for="(image, index) in images"
            :key="index"
            :style="{ width: '56px', height: '48px' }"
            class="lg:!w-[56px] lg:!h-[48px] lg:!max-w-[56px] lg:!max-h-[48px] first:ml-2"
          >
            <button class="flex" @click="handleSlideTo(index)">
              <div class="swiper-zoom-container">
                <ImageWithFallback
                  :src="image?.ProductImageSmall"
                  alt="Product thumbnail"
                  class-name="w-[60px] h-[50px] object-contain transition-opacity duration-300 lg:w-[56px] lg:h-[48px] mb-2 ml-2"
                  :class="[index !== activeImageIndex ? 'opacity-50' : '']"
                />
              </div>
            </button>
          </SwiperSlide>
        </Swiper>
      </div>
      <div class="flex flex-col items-end gap-2.5 self-start">
        <button
          class="flex justify-end text-slate-200 transition-colors duration-300 hover:text-blue-500"
          type="button"
          aria-label="Add to favorites"
          @click="addToFavourite(product)"
        >
          <HeartIcon class="w-6 h-6" />
        </button>
        <button class="flex justify-end text-slate-200 transition-colors duration-300 hover:text-blue-500" type="button" aria-label="Share">
          <Share2Icon class="w-6 h-6" />
        </button>
        <button class="flex justify-end text-slate-200 transition-colors duration-300 hover:text-blue-500" type="button" aria-label="Box">
          <BoxIcon class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BoxIcon, HeartIcon, Share2Icon } from 'lucide-vue-next';
import { A11y, Zoom } from 'swiper';

import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import type { FavouriteFolderRequestInterface } from '~/model/favourite-folder/request/favourite-folder.interface';
import type { ProductDetail } from '~/model/products/response/ProductDetailResponse';
import type { ProductImageInterface } from '~/model/products/response/ProductResponse';
import { addEntityToFavouriteList } from '~/composables/api/favorites';

const props = defineProps<{
  images: ProductImageInterface[];
  product: ProductDetail;
}>();

const emit = defineEmits(['showZoomModal']);

const activeImageIndex = defineModel<number>({ default: 0 });

const handleSlideTo = (index: number) => {
  activeImageIndex.value = index;
};

const addToFavourite = async (product: ProductDetail) => {
  const payload: FavouriteFolderRequestInterface = {
    name: product.name,
    isFolder: false,
    products: { id: product._id, stock: product.stock || 1 },
  };
  await addEntityToFavouriteList(payload);
};
</script>
