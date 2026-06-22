<template>
  <NuxtLink
    :to="`/product/${product._id}`"
    class="flex flex-col gap-2 relative font-Inter bg-white rounded-xl shadow-xs overflow-hidden h-full px-2.5 pt-[34px] pb-2 md:px-4 md:pt-10 md:pb-3 xl:pt-[34px] min-h-[280px]"
  >
    <ProductCardStock :stock="product.stock" />
    <div class="relative">
      <img v-if="hasValidImage" :src="productImageLarge" :alt="product.name" class="object-contain mx-auto max-h-[120px]" />
      <div v-else class="w-full flex items-center justify-center">
        <svgo-card-placehoder />
      </div>
      <div
        v-if="productDiscount"
        class="ring-1 ring-rose-500 rounded-full text-sm !leading-[1.5rem] font-semibold text-rose-500 px-2 absolute top-2 left-0"
      >
        {{ productDiscount ?? 0 }}%
      </div>
    </div>

    <section class="flex flex-col gap-1">
      <div class="flex gap-2 items-center">
        <h3 class="font-semibold text-neutral-700 inline truncate">
          {{ product.name }}
        </h3>
        <button class="flex">
          <svgo-info-circle class="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <div class="flex flex-col gap-1 text-xs max-w-[220px]">
        <h4 class="text-xs leading-tight font-semibold text-slate-500">Category</h4>
        <p class="hidden text-xs text-slate-500 truncate md:block">{{ product.description }}</p>
      </div>
    </section>
    <div class="mt-auto h-full min-h-[39px]">
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
    <div class="absolute right-0 flex flex-col gap-3 md:top-[32px]">
      <div class="pr-3 flex flex-col gap-2.5 md:pr-4">
        <button class="flex justify-end text-gray-500" @click="addToFavourite(product)">
          <SvgoCardHeartIcon class="w-6 h-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
        </button>
        <button class="flex justify-end text-gray-400 transition-colors duration-300 hover:text-blue-500">
          <SvgoCardShareIcon class="w-6 h-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
        </button>
        <button class="justify-end text-gray-400 transition-colors duration-300 hover:text-blue-500">
          <SvgoCardD3Icon class="w-6 h-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
        </button>
      </div>
    </div>
    <div
      class="absolute bottom-0 right-0 bg-blue-500 rounded-br-xl rounded-tl-xl px-6 py-3"
      @click.prevent="addToCart(product, priceConfiguration ? priceConfiguration.quantity : 1)"
    >
      <SvgoCart class="w-6 h-6 text-white" />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import { useNuxtApp } from '#app';
import type { FavouriteFolderRequestInterface } from '~/model/favourite-folder/request/favourite-folder.interface';
import type { AddToCartRequestInterface } from '~/model/cart/request/cart.interface';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~/model/products/response/ProductResponse';
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';
import { addEntityToFavouriteList } from '~/composables/api/favorites';
import { useAuthStore } from '~/store/authStore';
import { useCartStore } from '~/store/cartStore';
import ProductCardStock from '~/components/global/ProductCardStock.vue';

const authStore = useAuthStore();
const cartStore = useCartStore();

const { getUserDetails } = storeToRefs(authStore);
const { $api } = useNuxtApp();

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

  await $api.cart.addEntityToCart(payload);
  await cartStore.updateAndReturnCart();
};
const productImageLarge = computed(() => {
  return props.product.details?.ProductImage?.ProductImageLarge || '';
});
const hasValidImage = computed(() => {
  return productImageLarge.value && !productImageLarge.value.includes('not_valid_image');
});
</script>
