<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-Inter md:p-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6 xl:grid-cols-[minmax(0,9fr)_minmax(0,6fr)_minmax(0,5fr)] xl:gap-6"
  >
    <div class="flex min-w-0 items-start gap-2.5 md:gap-[15px]">
      <NuxtLink :to="`/product/${item._id}`" class="flex flex-shrink-0">
        <ImageWithFallback
          :src="item.details?.ProductImage?.ProductImageLarge"
          :alt="item.name"
          class="w-[100px] h-[100px] md:w-[120px] md:h-[120px]"
        />
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <div class="md:flex md:items-start md:justify-between md:gap-4 md:mb-4 lg:max-w-[480px]">
          <div class="mb-2.5 min-w-0 md:mb-0 md:mr-5 md:flex-1">
            <div class="flex min-w-0 items-start gap-1">
              <NuxtLink
                :to="`/product/${item._id}`"
                class="block min-w-0 flex-1 text-base font-semibold leading-snug line-clamp-2 md:text-xl md:leading-tight md:truncate md:line-clamp-none"
              >
                {{ item.name }}
              </NuxtLink>
              <UiDropdownMenu :modal="false" class="shrink-0 md:hidden">
                <UiDropdownMenuTrigger as-child>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary"
                    aria-label="Product options"
                  >
                    <MoreHorizontal class="h-5 w-5" />
                  </button>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent align="end" class="w-44">
                  <UiDropdownMenuItem @click="onCopyProductName">Copy product name</UiDropdownMenuItem>
                  <UiDropdownMenuItem>Add to favorites</UiDropdownMenuItem>
                  <UiDropdownMenuItem>Share</UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
              <button class="hidden flex-shrink-0 p-1 md:flex" type="button" aria-label="Copy product name">
                <CopyClipboard
                  :text="item.name || 'N/A'"
                  class="h-[22px] w-[22px] text-slate-500 transition-colors duration-300 hover:text-primary"
                />
              </button>
            </div>
          </div>
          <button
            class="mb-2.5 flex w-full max-w-full items-center text-slate-500 rounded-[25px] border border-gray-300 px-3 py-[5px] transition-colors duration-300 hover:border-primary hover:text-primary md:mb-0 md:w-fit md:max-w-[220px] md:flex-shrink-0"
            @click="showCustomProductPartNumberModal = true"
          >
            <span class="mr-2 truncate text-[15px] font-medium leading-tight">
              {{ item.manufacturerCode }}
            </span>
            <EditIcon class="h-5 w-5 flex-shrink-0" />
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
    <div class="mt-4 lg:mt-0 lg:pr-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-start">
        <div class="flex flex-col items-start gap-2 md:min-w-fit xl:gap-1.5">
          <span class="inline-flex items-center text-xs font-semibold leading-tight text-green-600">
            <CheckIcon class="mr-1 h-[15px] w-[15px] flex-shrink-0" />
            {{ item.stock }} in stock
          </span>
          <span class="hidden text-[13px] font-normal leading-tight text-neutral-700 md:inline"> Price for: Each </span>
          <span class="hidden text-[13px] font-normal leading-tight text-neutral-700 md:inline"> Multiple: 1 </span>
          <span class="hidden text-[13px] font-normal leading-tight text-neutral-700 md:inline">
            Minimum Order: {{ minPriceConfiguration ? minPriceConfiguration.quantity : 0 }}
          </span>
        </div>
        <section class="grid w-full max-w-[220px] grid-cols-2 gap-x-6 gap-y-1.5 sm:max-w-none md:flex md:min-w-fit md:gap-4">
          <div class="flex flex-col items-start gap-1">
            <span class="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1"> Qty </span>
            <span v-for="[qty] in bulkQuantities" :key="qty" class="text-[13px] leading-tight font-medium"> {{ qty }}+ </span>
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
        <div class="text-sm font-medium font-Poppins text-blue text-blue-500">View More</div>
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
  <LayoutCustomProductPartNumberModal
    v-if="showCustomProductPartNumberModal"
    :manufacturer-code="item.manufacturerCode"
    @close="showCustomProductPartNumberModal = false"
  />
</template>

<script setup lang="ts">
import { MoreHorizontal } from 'lucide-vue-next';
import { useClipboard } from '@vueuse/core';
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import { useToast } from '@/components/ui/toast/use-toast';
import EditIcon from '@/assets/icons/edit.svg';
import PDFIcon from '@/assets/icons/pdf.svg';
import LeafIcon from '@/assets/icons/leaf.svg';
import CheckIcon from '@/assets/icons/check-circle.svg';
import CartIcon from '@/assets/icons/cart.svg';
import HeartIcon from '@/assets/icons/heart.svg';
import ShareIcon from '@/assets/icons/share.svg';
import type { ProductActionObject } from '~/types/cart';
import { useAuthStore } from '~/store/authStore';
import { useCartStore } from '~/store/cartStore';
import { addToCartHelper, initializeQuantities, parseProductPriceConfiguration } from '~/helpers/prices.helper';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~/model/products/response/ProductResponse';

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
  { deep: true }
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

const { copy } = useClipboard();
const { toast } = useToast();

const onCopyProductName = () => {
  copy(props.item.name || 'N/A');
  toast({
    title: 'Text copied!',
  });
};

buildBulkQuantities();
</script>
