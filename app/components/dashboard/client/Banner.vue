<template>
  <div
    class="items-stretch shadow-xs bg-white flex w-full xl:max-w-[514px] flex-col rounded-xl h-[233px] md:h-[192px] xl:h-[240px] pb-1.5 relative"
  >
    <Swiper
      v-if="slides && slides.length > 0"
      :modules="[A11y, Pagination]"
      :slides-per-view="1"
      :space-between="15"
      :grab-cursor="true"
      :pagination="
        {
          bulletElement: 'button',
          clickable: true,
        } as any
      "
      class="homeFeaturedProducts--swiper w-[100%] h-[100%] block"
    >
      <SwiperSlide v-for="(item, index) in slides" :key="index">
        <section class="items-stretch bg-gray-700 w-full flex flex-col justify-center px-8 py-2 rounded-t-xl max-md:max-w-full max-md:px-5">
          <div class="justify-between items-stretch flex gap-5 max-md:max-w-full max-md:flex-wrap">
            <div class="text-white text-sm leading-6 grow shrink basis-auto">
              {{ item.title }}
            </div>
            <div
              class="text-white text-sm leading-[22px] whitespace-nowrap justify-center items-stretch border px-2 rounded-[100px] border-solid border-white"
            >
              {{ item.discount }}
            </div>
          </div>
        </section>
        <div
          class="justify-between items-stretch self-stretch xl:max-w-[530px] flex flex-col md:flex-row xl:flex-col pt-3 px-8 max-md:px-5 gap-3"
        >
          <div class="max-md:max-w-full">
            <div class="gap-5 flex max-md:items-stretch max-md:gap-0 h-[100px]">
              <div class="flex flex-col items-stretch w-[22%] max-md:w-full max-md:ml-0">
                <SvgoCardPlaceholderSmall class="w-[100px] h-[100px]" />
              </div>
              <div class="flex flex-col items-stretch w-[78%] ml-5 max-md:w-full max-md:ml-0">
                <div
                  class="items-stretch flex flex-col text-xs text-zinc-800 font-medium mt-2.5 min-w-[200px] md:min-w-[352px] lg:min-w-[592px] xl:min-w-0"
                >
                  <div class="text-base leading-6">
                    {{ item.productCode }}
                  </div>
                  <div class="leading-[20px] mt-1">
                    {{ item.description }}
                  </div>
                  <div class="overflow-hidden text-slate-500 text-ellipsis leading-[16px] mt-1">
                    {{ item.details }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="justify-between items-end flex flex-row md:flex-col xl:flex-row w-full gap-5 max-md:max-w-full max-md:flex-wrap">
            <section class="justify-center items-stretch flex flex-col whitespace-nowrap md:self-end">
              <div class="text-zinc-800 text-sm leading-4 line-through">
                {{ item.originalPrice }}
              </div>
              <div class="items-stretch flex justify-between gap-1 text-red-500 mt-1">
                <div class="text-base font-bold leading-5 grow">
                  {{ item.salePrice }}
                </div>
                <div class="text-sm leading-5 grow">
                  {{ `(${item.quantity}+)` }}
                </div>
              </div>
            </section>
            <UiButton
              type="button"
              class="h-auto justify-between items-stretch bg-blue-500 flex gap-2 px-9 py-2 rounded-lg max-md:px-5 w-fit hover:bg-blue-400 hover:opacity-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              :aria-label="`Add ${item.productCode || 'product'} to cart`"
              :aria-busy="isSlideAdding(item)"
              :aria-disabled="isSlideAdding(item) || !item._id"
              @click="addToCart(item)"
            >
              <svg
                class="aspect-square object-contain object-center w-6 overflow-hidden shrink-0 max-w-full"
                width="25"
                height="24"
                viewBox="0 0 25 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5 20.5C11.5 21.3284 10.8284 22 10 22C9.17157 22 8.5 21.3284 8.5 20.5C8.5 19.6716 9.17157 19 10 19C10.8284 19 11.5 19.6716 11.5 20.5Z"
                  stroke="white"
                  stroke-width="1.5"
                />
                <path
                  d="M20.5 20.5C20.5 21.3284 19.8284 22 19 22C18.1716 22 17.5 21.3284 17.5 20.5C17.5 19.6716 18.1716 19 19 19C19.8284 19 20.5 19.6716 20.5 20.5Z"
                  stroke="white"
                  stroke-width="1.5"
                />
                <path
                  d="M6.5 4H18.5C20.7091 4 22.5 5.79086 22.5 8V13C22.5 15.2091 20.7091 17 18.5 17H10.5C8.29086 17 6.5 15.2091 6.5 13V4ZM6.5 4C6.5 2.89543 5.60457 2 4.5 2H2.5M6.5 8H22"
                  stroke="white"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="text-white text-sm font-medium leading-6 grow whitespace-nowrap">
                {{ isSlideAdding(item) ? 'Adding…' : item.addToCartText || 'Add to cart' }}
              </div>
            </UiButton>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
    <section v-else class="absolute inset-0 flex flex-col items-center justify-center text-center">
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="w-full">No results.</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/vue';
import type { ProductBannerInterface } from '~~/types/dashboard/client-dashboard';
import type { ProductInterface } from '~~/types/product';
import { addToCartHelper } from '~~/helpers/prices.helper';
import { toast } from '~/components/ui/toast';
import { useCart } from '~/composables/useCart';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';

const { isProductAddInFlight } = useCart();

defineProps<{
  slides: Array<ProductBannerInterface>;
}>();

const isSlideAdding = (product: ProductBannerInterface) => isProductAddInFlight(product._id ?? '');

const addToCart = async (product: ProductBannerInterface) => {
  if (!product._id || isProductAddInFlight(product._id)) {
    if (!product._id) {
      toast({
        title: 'Could not update cart',
        description: 'This offer is missing a product id.',
        variant: 'destructive',
      });
    }
    return;
  }

  const stock = Math.max(1, Number(product.quantity) || 1);
  const availableStock = Math.max(0, Number(product.availableStock ?? 0));

  const response = (await addToCartHelper(
    {
      _id: product._id,
      stock: availableStock,
    } as ProductInterface,
    stock,
  )) as { status?: string; changed?: boolean } | null;

  if (response?.status !== 'success' || response.changed === false) {
    return;
  }

  toast({
    title: 'Added to cart',
    description: product.productCode ? `${product.productCode} · qty ${stock}` : `Quantity ${stock} added`,
  });
};
</script>

<style>
@reference "../../../assets/css/main.css";
.homeFeaturedProducts--swiper {
  @apply px-0 pt-0 pb-[30px]!;
}

.homeFeaturedProducts--swiper .swiper-slide {
  @apply h-auto!;
}

.homeFeaturedProducts--swiper .swiper-pagination {
  @apply bottom-0 space-x-1.5 md:space-x-2!;
}

.homeFeaturedProducts--swiper .swiper-pagination-bullet {
  @apply w-1.5 h-1.5 bg-light-500 rounded-full opacity-100 m-0 transition-all duration-300 md:w-2 md:h-2!;
  margin-right: 0 !important;
}

.homeFeaturedProducts--swiper .swiper-pagination-bullet.swiper-pagination-bullet-active {
  @apply scale-125 bg-gray-300!;
}
</style>
