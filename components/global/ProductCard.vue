<template>
  <NuxtLink
    :to="`/product/${product._id}`"
    class="relative grid h-full grid-cols-[108px_minmax(0,1fr)] gap-x-3 gap-y-2 overflow-hidden rounded-xl bg-white px-3 py-3 font-Inter shadow-xs md:flex md:min-h-[280px] md:flex-col md:gap-2 md:px-4 md:pb-3 md:pt-10 xl:pt-[34px]"
  >
    <ProductCardStock :stock="product.stock" />
    <div class="relative row-span-2 self-center md:row-span-auto md:self-auto">
      <ImageWithFallback
        :src="productCardImageSrc"
        :alt="product.name"
        class-name="mx-auto h-24 w-full max-w-full object-contain md:h-[120px]"
      />
      <div
        v-if="productDiscount"
        class="ring-1 ring-rose-500 rounded-full text-sm !leading-[1.5rem] font-semibold text-rose-500 px-2 absolute top-2 left-0"
      >
        {{ productDiscount ?? 0 }}%
      </div>
    </div>

    <section class="flex min-w-0 flex-col gap-1 pr-24 md:min-h-[64px] md:pr-0">
      <div class="flex min-w-0 items-center gap-2">
        <h3 class="block min-w-0 flex-1 truncate font-semibold text-neutral-700">
          {{ product.name }}
        </h3>
        <button class="flex shrink-0" type="button" aria-label="View product information" @click.prevent>
          <svgo-info-circle class="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <div class="flex max-w-[220px] flex-col gap-1 text-xs md:min-h-[34px]">
        <h4 class="text-xs leading-tight font-semibold text-slate-500">Category</h4>
        <p class="hidden text-xs text-slate-500 truncate md:block">{{ product.description }}</p>
      </div>
    </section>
    <div class="col-start-2 h-auto min-h-0 pr-14 md:col-start-auto md:mt-auto md:h-full md:min-h-[39px] md:pr-0">
      <div class="min-h-[14px] leading-tight line-through text-xs">
        <template v-if="productDiscount">
          {{
            priceConfiguration
              ? `${priceConfiguration.price.toFixed(2)} Lei
                    (${priceConfiguration.quantity}+)`
              : '-'
          }}
        </template>
      </div>
      <div class="flex gap-1 items-center" :class="[productDiscount ? 'text-rose-500' : '']">
        <strong>
          {{ discountPrice ? `${discountPrice.toFixed(2)} Lei` : priceConfiguration?.price.toFixed(2) || '-' }}
        </strong>
        <span class="text-xs">
          {{ priceConfiguration ? `(${priceConfiguration.quantity}+)` : '-' }}
        </span>
      </div>
    </div>
    <div class="absolute right-3 top-3 flex flex-row gap-1.5 md:right-0 md:top-[32px] md:flex-col md:gap-3">
      <div class="flex gap-1.5 md:flex-col md:gap-2.5 md:pr-4">
        <button
          class="flex justify-end text-gray-500"
          type="button"
          aria-label="Add product to favorites"
          @click.prevent="addToFavourite(product)"
        >
          <SvgoCardHeartIcon class="w-6 h-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
        </button>
        <button
          class="flex justify-end text-gray-400 transition-colors duration-300 hover:text-blue-500"
          type="button"
          aria-label="Share product"
          @click.prevent
        >
          <SvgoCardShareIcon class="w-6 h-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
        </button>
        <button
          class="flex justify-end text-gray-400 transition-colors duration-300 hover:text-blue-500"
          type="button"
          aria-label="Open product 3D view"
          @click.prevent
        >
          <SvgoCardD3Icon class="w-6 h-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
        </button>
      </div>
    </div>
    <button
      type="button"
      aria-label="Add product to cart"
      class="col-start-2 flex h-10 w-12 items-center justify-center justify-self-end rounded-lg bg-blue-500 md:absolute md:bottom-0 md:right-0 md:h-auto md:w-auto md:rounded-br-xl md:rounded-tl-xl md:px-6 md:py-3"
      @click.prevent="addToCart(product, priceConfiguration ? priceConfiguration.quantity : 1)"
    >
      <SvgoCart class="w-6 h-6 text-white" />
    </button>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import type { FavouriteFolderRequestInterface } from '~/model/favourite-folder/request/favourite-folder.interface';
import type { AddToCartRequestInterface } from '~/model/cart/request/cart.interface';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~/model/products/response/ProductResponse';
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';
import { addEntityToFavouriteList } from '~/composables/api/favorites';
import { useCart } from '~/composables/useCart';
import { useAuthStore } from '~/store/authStore';
import ProductCardStock from '~/components/global/ProductCardStock.vue';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';

const authStore = useAuthStore();
const { addToCart: addCartItem } = useCart();

const { getUserDetails } = storeToRefs(authStore);

const props = defineProps({
  product: {
    type: Object as PropType<ProductInterface>,
    required: true,
  },
});

const discountsHelper = parseProductPriceConfiguration(props.product, getUserDetails.value, props.product?.stock);

const priceConfiguration = ref<PriceConfigurationSettingsInterface | undefined>(discountsHelper?.minimumOrderQuantityConfiguration);
const discountPrice = ref(discountsHelper?.discountPrice || 0);
const productDiscount = ref(discountsHelper?.productDiscount || 0);

const addToFavourite = async (product: ProductInterface) => {
  const payload: FavouriteFolderRequestInterface = {
    name: product.name,
    isFolder: false,
    products: { id: product._id ?? '', stock: product.stock || 1 },
  };

  await addEntityToFavouriteList(payload);
};

const addToCart = async (product: ProductInterface, stockToAdd = 1) => {
  const payload: AddToCartRequestInterface = {
    userId: '',
    products: [
      {
        id: product._id ?? '',
        stock: stockToAdd,
        isFolder: false,
        initialUnitPrice: 0,
        unitPriceAfterDiscounts: 0,
        total: 0,
        subtotal: 0,
        discount: { value: 0, startDate: '', endDate: '' },
      },
    ],
  };

  await addCartItem(payload);
};
const productImageLarge = computed(() => {
  return props.product.details?.ProductImage?.ProductImageLarge || '';
});
const productCardImageSrc = computed(() => {
  const src = productImageLarge.value.trim();
  return src && !src.includes('not_valid_image') ? src : undefined;
});
</script>
