<template>
  <div
    class="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-Inter md:p-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6 xl:grid-cols-[minmax(0,9fr)_minmax(0,6fr)_minmax(0,5fr)] xl:gap-6"
  >
    <div class="flex items-start">
      <NuxtLink
        :to="`/product/${item._id}`"
        class="flex flex-shrink-0 mr-2.5 md:mr-[15px]"
      >
        <ImageWithFallback
          :src="item.details?.ProductImage?.ProductImageLarge"
          :alt="item.name"
          class="w-[100px] h-[100px] md:w-[120px] md:h-[120px]"
        />
      </NuxtLink>
      <div>
        <div class="md:flex md:items-start md:justify-between md:gap-4 md:mb-4 max-w-[480px]">
          <div class="flex items-center mb-2.5 md:mb-0 md:mr-5 md:flex-1 min-w-0">
            <NuxtLink
              :to="`/product/${item._id}`"
              class="block min-w-0 flex-1 text-xl leading-tight font-semibold truncate"
            >
              {{ item.name }}
            </NuxtLink>
            <div class="ml-1 flex flex-shrink-0 items-center gap-1">
              <button
                class="flex p-1"
                type="button"
                aria-label="Copy product name"
              >
                <CopyClipboard
                  :text="item.name || 'N/A'"
                  class="w-[22px] h-[22px] text-slate-500 transition-colors duration-300 hover:text-blue-500"
                />
              </button>
              <div class="flex items-center gap-2 md:hidden">
                <button
                  class="flex p-1 text-gray-500 transition-colors duration-300 hover:text-blue"
                  type="button"
                  aria-label="Favorite"
                >
                  <HeartIcon class="w-6 h-6" />
                </button>
                <button
                  class="flex p-1 text-gray-500 transition-colors duration-300 hover:text-blue"
                  type="button"
                  aria-label="Share"
                >
                  <ShareIcon class="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
          <button
            class="flex items-center text-slate-500 px-3 py-[5px] w-fit max-w-full border border-gray-300 rounded-[25px] mb-2.5 transition-colors duration-300 hover:text-blue-500 hover:border-blue-500 md:mb-0 md:max-w-[220px] md:flex-shrink-0"
            @click="showCustomProductPartNumberModal = true"
          >
            <span class="text-[15px] leading-tight font-medium mr-2 truncate">
              {{ item.manufacturerCode }}
            </span>
            <EditIcon class="w-5 h-5" />
          </button>
        </div>
        <div class="grid grid-cols-1 gap-2 text-xs leading-tight mb-4 md:mb-5 lg:mb-0">
          <div>
            {{ item.description }}
          </div>
          <div>Manufacturer: {{ item.manufacturer }}</div>
          <div>Manufacturer part number: {{ item.manufacturerCode }}</div>
          <div class="flex items-center">
            <button class="flex items-center transition-colors duration-300 mr-[9px] hover:text-blue-500">
              <PDFIcon class="w-[22px] h-[22px] mr-[5px]" />
              <span class="text-xs leading-tight font-medium">Datasheet</span>
            </button>
            <button class="flex items-center transition-colors duration-300 hover:text-blue-500">
              <LeafIcon class="w-[22px] h-[22px] mr-[5px]" />
              <span class="text-xs leading-tight font-medium">RoHS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="lg:pr-6">
      <div class="flex">
        <div class="flex flex-col items-start min-w-fit gap-2 xl:gap-1.5">
          <span class="text-xs text-green-500 leading-tight font-semibold md:mr-[15px] lg:mr-0 flex mb-2">
            <CheckIcon class="w-[15px] h-[15px] mr-1" />
            {{ item.stock }} in stock
          </span>
          <span class="hidden text-[13px] leading-tight text-neutral-700 font-normal mr-[15px] md:inline"> Price for: Each </span>
          <span class="hidden text-[13px] leading-tight text-neutral-700 font-normal mr-[15px] md:inline"> Multiple: 1 </span>
          <span class="hidden text-[13px] leading-tight text-neutral-700 font-normal mr-[15px] md:inline">
            Minimum Order: {{ minPriceConfiguration ? minPriceConfiguration.quantity : 0 }}
          </span>
        </div>
        <section class="grid grid-cols-2 gap-x-4 gap-y-1.5 md:flex md:gap-4 min-w-fit">
          <div class="flex flex-col items-start gap-1">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1"> Qty </span>
            <span
              v-for="[qty] in bulkQuantities"
              :key="qty"
              class="text-[13px] leading-tight font-medium"
            > {{ qty }}+ </span>
          </div>
          <div class="flex flex-col items-start gap-1">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1"> Price (Ex VAT)</span>
            <span
              v-for="[, price] in bulkQuantities"
              :key="price"
              class="text-[13px] leading-tight font-semibold"
              :class="[productDiscount ? 'text-rose-500' : 'text-blue-600']"
            >
              {{ price.toFixed(2) }} Lei
            </span>
          </div>
        </section>
      </div>
      <div class="grid grid-cols-2 pt-3 mb-4 md:grid-cols-[70%,30%] md:mb-5 lg:grid-cols-[40%,60%] lg:mb-0">
        <div class="text-sm font-medium font-Poppins text-blue text-blue-500">
          View More
        </div>
      </div>
    </div>
    <div class="flex gap-2.5 pt-1 md:col-span-2 xl:col-span-1 xl:items-end">
      <QuantityButtons
        v-if="minPriceConfiguration"
        v-model="quantity"
        size="lg"
        :object="{ action: 'update', min: minPriceConfiguration.quantity, id: item._id } as ProductActionObject"
      />
      <button
        :disabled="quantity === 0"
        class="flex items-center flex-1 justify-center bg-blue-500 rounded text-white px-5 py-[9px]"
        @click="addToCart(item)"
      >
        <CartIcon class="w-6 h-6 mr-2" />
        <span class="text-sm font-medium">Add to cart</span>
      </button>
    </div>
    <div class="hidden md:flex absolute top-5 right-5 flex-col gap-2.5">
      <button class="flex justify-end text-gray-500 transition-colors duration-300 hover:text-blue">
        <HeartIcon class="w-6 h-6" />
      </button>
      <button class="flex justify-end text-gray-500 transition-colors duration-300 hover:text-blue">
        <ShareIcon class="w-6 h-6" />
      </button>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="fade">
      <LayoutCustomProductPartNumberModal
        v-if="showCustomProductPartNumberModal"
        :manufacturer-code="item.manufacturerCode"
        @close="showCustomProductPartNumberModal = false"
      />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import EditIcon from '@/assets/icons/edit.svg';
import PDFIcon from '@/assets/icons/pdf.svg';
import LeafIcon from '@/assets/icons/leaf.svg';
import CheckIcon from '@/assets/icons/check-circle.svg';
import CartIcon from '@/assets/icons/cart.svg';
import HeartIcon from '@/assets/icons/heart.svg';
import ShareIcon from '@/assets/icons/share.svg';
import type { ProductActionObject } from '~/model/cart/response/cart.interface';
import { useNuxtApp } from '#app';
import { useAuthStore } from '~/store/authStore';
import { useCartStore } from '~/store/cartStore';
import { addToCartHelper, initializeQuantities, parseProductPriceConfiguration } from '~/helpers/prices.helper';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~/model/products/response/ProductResponse';

const { $api: _$api } = useNuxtApp();
const quantity = ref(1);
const initialRequestedQuantity = ref(0);

const props = defineProps({
  item: {
    type: Object as PropType<ProductInterface>,
    required: true,
  },
});

const authStore = useAuthStore();
const cartStore = useCartStore();

const { getUserDetails } = storeToRefs(authStore);
const { cart } = storeToRefs(cartStore);

const minPriceConfiguration = ref<PriceConfigurationSettingsInterface | undefined>(undefined);
const currentPriceConfiguration = ref<PriceConfigurationSettingsInterface | undefined>(undefined);
const discountPrice = ref(0);
const userDiscount = ref(0);
const productDiscount = ref(0);

watch(
  [cart],
  async () => {
    await fetchCart();
  },
  { deep: true },
);

const getPricesConfiguration = () => {
  const discountsHelper = parseProductPriceConfiguration(props.item, getUserDetails.value, quantity.value);

  minPriceConfiguration.value = discountsHelper?.minimumOrderQuantityConfiguration;
  currentPriceConfiguration.value = discountsHelper?.priceConfiguration;
  discountPrice.value = discountsHelper?.discountPrice || 0;
  userDiscount.value = discountsHelper?.userDiscount || 0;
  productDiscount.value = discountsHelper?.productDiscount || 0;
};

const fetchCart = async () => {
  const data = cart.value;

  getPricesConfiguration();

  if (data) {
    initializeQuantities(props.item, data, quantity, initialRequestedQuantity, minPriceConfiguration.value!);
  }

  getPricesConfiguration();
};

await fetchCart();

const bulkQuantities = new Map<number, number>();

const buildBulkQuantities = () => {
  if (!props.item.priceConfiguration) {
    return;
  }

  props.item.priceConfiguration.configuration.forEach((configuration: PriceConfigurationSettingsInterface) => {
    const discount = productDiscount.value || userDiscount.value || 0;
    bulkQuantities.set(configuration.quantity, (configuration.price * (100 - Number(discount))) / 100);
  });
};

const addToCart = async (product: ProductInterface) => {
  const stock = initialRequestedQuantity.value > 0 ? quantity.value - initialRequestedQuantity.value : quantity.value;

  const response = (await addToCartHelper(product, stock)) as { status?: string };

  if (response.status === 'success') {
    await cartStore.updateAndReturnCart();
    await fetchCart();
  }
};

const showCustomProductPartNumberModal = ref(false);

buildBulkQuantities();
</script>
