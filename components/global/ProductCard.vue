<template>
  <div
    class="relative grid h-full grid-cols-[108px_minmax(0,1fr)] grid-rows-[auto_1fr] items-start gap-x-3 gap-y-2 overflow-hidden rounded-xl bg-white px-3 py-3 font-Inter shadow-xs md:flex md:min-h-[280px] md:flex-col md:grid-rows-none md:gap-2 md:px-4 md:pb-3 md:pt-10 xl:pt-[34px]"
  >
    <NuxtLink
      :to="`/product/${product._id}`"
      :aria-label="`View ${product.name}`"
      class="absolute inset-0 z-10 grid h-full grid-cols-[108px_minmax(0,1fr)] grid-rows-[auto_1fr] items-start gap-x-3 gap-y-2 overflow-hidden rounded-xl bg-white px-3 py-3 font-Inter shadow-xs md:flex md:min-h-[280px] md:flex-col md:grid-rows-none md:gap-2 md:px-4 md:pb-3 md:pt-10 xl:pt-[34px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span class="sr-only">View {{ product.name }}</span>
    </NuxtLink>

    <div class="relative z-20 col-start-1 row-start-1 row-span-2 self-start md:row-span-auto md:self-auto">
      <ProductCardStock :stock="product.stock" />
      <ImageWithFallback
        :src="productCardImageSrc"
        :alt="product.name"
        class-name="mx-auto h-24 w-full max-w-full object-contain md:h-[120px]"
      />
      <div
        v-if="productDiscount"
        class="absolute left-0 top-2 rounded-full px-2 text-sm font-semibold !leading-[1.5rem] text-rose-500 ring-1 ring-rose-500"
      >
        {{ productDiscount ?? 0 }}%
      </div>
    </div>

    <div class="relative z-20 col-start-2 row-start-1 flex min-w-0 flex-col gap-1 md:min-h-[64px]">
      <div class="flex min-w-0 items-start gap-1 md:items-center md:gap-2">
        <h3
          class="block min-w-0 flex-1 text-sm font-semibold leading-snug text-neutral-700 line-clamp-2 md:truncate md:text-base md:leading-normal"
        >
          {{ product.name }}
        </h3>
        <UiDropdownMenu :modal="false" class="shrink-0 md:hidden">
          <UiDropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-slate-100 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Product options"
              @click.prevent.stop
            >
              <MoreHorizontal class="h-5 w-5" />
            </button>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-44" @click.stop>
            <UiDropdownMenuItem @click.prevent.stop="onMobileFavorite">Add to favorites</UiDropdownMenuItem>
            <UiDropdownMenuItem @click.prevent.stop>Share</UiDropdownMenuItem>
            <UiDropdownMenuItem @click.prevent.stop>3D view</UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
        <button
          class="hidden shrink-0 md:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          type="button"
          aria-label="View product information"
          @click.prevent
        >
          <svgo-info-circle class="h-4 w-4 text-slate-500" />
        </button>
      </div>
      <div class="hidden max-w-[220px] flex-col gap-1 text-xs md:flex md:min-h-[34px]">
        <h4 class="text-xs font-semibold leading-tight text-slate-500">Category</h4>
        <p class="truncate text-xs text-slate-500">{{ product.description }}</p>
      </div>
    </div>

    <div
      class="relative z-20 col-start-2 row-start-2 flex min-w-0 items-end justify-between gap-2 self-stretch md:col-start-auto md:row-start-auto md:mt-auto md:block md:h-full md:min-h-[39px]"
    >
      <div class="min-w-0">
        <div class="min-h-[14px] text-xs leading-tight line-through">
          <template v-if="productDiscount">
            {{
              priceConfiguration
                ? `${priceConfiguration.price.toFixed(2)} Lei
                    (${priceConfiguration.quantity}+)`
                : '-'
            }}
          </template>
        </div>
        <div class="flex flex-wrap items-center gap-1" :class="[productDiscount ? 'text-rose-500' : '']">
          <strong class="text-sm leading-tight md:text-base">
            {{ discountPrice ? `${discountPrice.toFixed(2)} Lei` : priceConfiguration?.price.toFixed(2) || '-' }}
          </strong>
          <span class="text-xs">
            {{ priceConfiguration ? `(${priceConfiguration.quantity}+)` : '-' }}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label="Add product to cart"
        :aria-labelledby="`add-to-cart-${product._id}`"
        class="col-start-2 flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:absolute md:bottom-0 md:right-0 md:h-auto md:w-auto md:rounded-br-xl md:rounded-tl-xl md:px-6 md:py-3"
        @click.prevent="addToCart(product, priceConfiguration ? priceConfiguration.quantity : 1)"
      >
        <SvgoCart class="h-6 w-6 text-white" />
        <span :id="`add-to-cart-${product._id}`" class="sr-only">Add {{ product.name }} to cart</span>
      </button>
    </div>

    <div class="absolute right-0 top-[32px] hidden z-20 flex-col gap-2.5 pr-4 md:flex">
      <button
        class="flex justify-end text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        type="button"
        aria-label="Add product to favorites"
        @click.prevent="addToFavourite(product)"
      >
        <SvgoCardHeartIcon class="h-6 w-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
      </button>
      <button
        class="flex justify-end text-gray-400 transition-colors duration-300 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        type="button"
        aria-label="Share product"
        @click.prevent
      >
        <SvgoCardShareIcon class="h-6 w-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
      </button>
      <button
        class="flex justify-end text-gray-400 transition-colors duration-300 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        type="button"
        aria-label="Open product 3D view"
        @click.prevent
      >
        <SvgoCardD3Icon class="h-6 w-6 text-gray-400 transition-colors duration-300 hover:text-blue-500" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import { MoreHorizontal } from 'lucide-vue-next';
import type { FavouriteFolderRequestInterface } from '~/model/favourite-folder/request/favourite-folder.interface';
import type { AddToCartRequestInterface } from '~/types/cart';
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

const onMobileFavorite = () => {
  void addToFavourite(props.product);
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
