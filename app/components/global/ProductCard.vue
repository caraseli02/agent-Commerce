<template>
  <div
    class="relative grid h-full grid-cols-[108px_minmax(0,1fr)] grid-rows-[auto_1fr] items-start gap-x-3 gap-y-2 overflow-hidden rounded-xl bg-white px-3 py-3 font-Inter shadow-xs md:flex md:min-h-[280px] md:flex-col md:grid-rows-none md:gap-2 md:px-4 md:py-4"
  >
    <NuxtLink
      :to="productRoute"
      :aria-label="`View ${product.name}`"
      class="group relative col-start-1 row-start-1 row-span-2 w-full max-w-[108px] self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:max-w-none md:row-span-auto md:self-auto"
    >
      <!-- Catalog media frame: white backdrop; cover fills the frame -->
      <div
        class="relative mx-auto aspect-square w-full overflow-hidden rounded-lg bg-white transition-transform duration-200 group-hover:scale-[1.02] md:aspect-auto md:h-[160px]"
      >
        <ProductCardStock :stock="product.stock" />
        <ImageWithFallback
          :src="productCardImageSrc"
          :alt="product.name"
          class-name="h-full w-full object-cover object-center transition-opacity duration-200 group-hover:opacity-95"
        />
      </div>
      <div
        v-if="productDiscount"
        class="pointer-events-none absolute left-0 top-2 rounded-full px-2 text-sm font-semibold !leading-[1.5rem] text-rose-500 ring-1 ring-rose-500"
      >
        {{ productDiscount ?? 0 }}%
      </div>
    </NuxtLink>

    <div class="relative col-start-2 row-start-1 flex w-full min-w-0 max-w-full flex-col gap-1 md:min-h-[64px]">
      <div class="flex w-full min-w-0 max-w-full items-start gap-1 md:items-center md:gap-2">
        <h3 class="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-neutral-700 md:text-base md:leading-normal">
          <NuxtLink
            :to="productRoute"
            class="cursor-pointer rounded-sm text-inherit transition-colors hover:text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {{ product.name }}
          </NuxtLink>
        </h3>
        <!-- Wrapper needed: UiDropdownMenu/Root does not forward class attrs; keep md:hidden here -->
        <div class="ml-auto shrink-0 md:hidden">
          <UiDropdownMenu :modal="false">
            <UiDropdownMenuTrigger as-child>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-slate-100 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label="Product options"
                @click.prevent.stop
              >
                <MoreHorizontal class="h-5 w-5" />
              </button>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent align="end" class="w-44">
              <!-- Wrapper carries the click handler: DropdownMenuContent renders a fragment/portal root, so
                   listeners bound directly on it are dropped by Vue and clicks leak to the parent card link. -->
              <div @click.stop>
                <UiDropdownMenuItem @click.prevent.stop>Share</UiDropdownMenuItem>
                <UiDropdownMenuItem @click.prevent.stop>3D view</UiDropdownMenuItem>
              </div>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </div>
      </div>
      <div class="hidden max-w-[220px] flex-col gap-1 text-xs md:flex md:min-h-[34px]">
        <p v-if="productCategory" class="break-words text-xs font-semibold leading-tight text-slate-500">{{ productCategory }}</p>
        <p class="line-clamp-2 text-xs text-slate-500" :title="product.description">{{ product.description }}</p>
      </div>
    </div>

    <div
      class="relative col-start-2 row-start-2 flex min-w-0 items-end justify-between gap-2 self-stretch md:col-start-auto md:row-start-auto md:mt-auto md:block md:h-full md:min-h-[39px]"
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
        :aria-busy="isThisProductAdding"
        :aria-disabled="isThisProductAdding"
        class="col-start-2 flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 md:absolute md:bottom-0 md:right-0 md:min-h-11 md:w-auto md:rounded-br-xl md:rounded-tl-xl md:px-6 md:py-3"
        @click.prevent="addToCart(product, priceConfiguration ? priceConfiguration.quantity : 1)"
      >
        <SvgoCart class="h-6 w-6 text-white" />
        <span :id="`add-to-cart-${product._id}`" class="sr-only">Add {{ product.name }} to cart</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import { MoreHorizontal } from '@lucide/vue';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~~/types/product';
import { addToCartHelper, resolveProductBrowsePricing } from '~~/helpers/prices.helper';
import { getProductTaxonomyPath, humanizeCategorySlug, toCategorySlugSegments } from '~~/helpers/categoryPath.helper';
import { useCart } from '~/composables/useCart';
import { useAuthStore } from '~/store/authStore';
import ProductCardStock from '~/components/global/ProductCardStock.vue';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';

const authStore = useAuthStore();
const { isProductAddInFlight } = useCart();

const { getUserDetails } = storeToRefs(authStore);

const props = defineProps({
  product: {
    type: Object as PropType<ProductInterface>,
    required: true,
  },
});

const productRoute = computed(() => `/product/${props.product.alias || props.product._id}`);
const productCategory = computed(() => {
  const segments = toCategorySlugSegments(getProductTaxonomyPath(props.product));
  return segments.length ? humanizeCategorySlug(segments[segments.length - 1]!) : '';
});

const isThisProductAdding = computed(() => isProductAddInFlight(props.product._id ?? ''));

const discountsHelper = computed(() => resolveProductBrowsePricing(props.product, getUserDetails.value));

const priceConfiguration = computed<PriceConfigurationSettingsInterface | undefined>(
  () => discountsHelper.value?.minimumOrderQuantityConfiguration,
);
const discountPrice = computed(() => discountsHelper.value?.discountPrice || 0);
const productDiscount = computed(() => discountsHelper.value?.productDiscount || discountsHelper.value?.userDiscount || 0);

const addToCart = async (product: ProductInterface, stockToAdd = 1) => {
  if (isProductAddInFlight(product._id ?? '')) {
    return;
  }

  await addToCartHelper(product, stockToAdd);
};
const productImageLarge = computed(() => {
  return props.product.details?.ProductImage?.ProductImageLarge || '';
});
const productCardImageSrc = computed(() => {
  const src = productImageLarge.value.trim();
  return src && !src.includes('not_valid_image') ? src : undefined;
});
</script>
