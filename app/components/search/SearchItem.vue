<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-Inter md:p-5 md:pr-14 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.95fr)] lg:items-center lg:gap-0"
  >
    <!-- Identity: image + title/code/stock + meta -->
    <div class="flex min-w-0 items-start gap-3 md:gap-4 lg:items-center lg:pr-6">
      <NuxtLink :to="`/product/${item.alias || item._id}`" class="flex flex-shrink-0">
        <ImageWithFallback
          :src="item.details?.ProductImage?.ProductImageLarge"
          :alt="item.name"
          class="h-[100px] w-[100px] rounded-lg bg-slate-50 object-contain md:h-[120px] md:w-[120px]"
        />
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <div class="mb-2 flex w-fit max-w-full min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2 md:mb-2.5">
          <div class="flex min-w-0 items-start gap-1">
            <NuxtLink
              :to="`/product/${item.alias || item._id}`"
              class="block min-w-0 text-base font-semibold leading-snug line-clamp-2 md:text-xl md:leading-tight"
            >
              {{ item.name }}
            </NuxtLink>
            <UiDropdownMenu :modal="false" class="shrink-0 md:hidden">
              <UiDropdownMenuTrigger as-child>
                <UiButton type="button" variant="ghost" size="icon" class="h-8 w-8" aria-label="Product options">
                  <MoreHorizontal class="h-5 w-5" />
                </UiButton>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="end" class="w-44">
                <UiDropdownMenuItem @click="onCopyProductName">Copy product name</UiDropdownMenuItem>
                <UiDropdownMenuItem>Share</UiDropdownMenuItem>
              </UiDropdownMenuContent>
            </UiDropdownMenu>
            <CopyClipboard
              :text="item.name || 'N/A'"
              label="Copy product name"
              class="hidden flex-shrink-0 text-slate-500 transition-colors duration-300 hover:text-primary md:inline-flex"
            />
          </div>
          <UiButton type="button" variant="outline" class="max-w-full shrink-0" @click="showCustomProductPartNumberModal = true">
            <span class="mr-2 truncate text-[15px] font-medium leading-tight">
              {{ item.manufacturerCode }}
            </span>
            <EditIcon class="h-5 w-5 flex-shrink-0" />
          </UiButton>
          <span
            class="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold leading-tight text-green-600"
          >
            <CheckIcon class="mr-1 h-[15px] w-[15px] flex-shrink-0" />
            {{ item.stock }} in stock
          </span>
        </div>
        <div class="grid grid-cols-1 gap-1.5 text-xs leading-snug text-slate-600">
          <div class="line-clamp-3 md:line-clamp-none" :title="item.description">{{ item.description }}</div>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <span>Manufacturer: {{ item.manufacturer }}</span>
            <span>Manufacturer part number: {{ item.manufacturerCode }}</span>
          </div>
          <dl class="hidden flex-wrap gap-x-4 gap-y-1 text-[13px] leading-tight text-neutral-700 md:flex">
            <div class="flex gap-1.5">
              <dt class="text-slate-500">Price for:</dt>
              <dd class="font-medium">Each</dd>
            </div>
            <div class="flex gap-1.5">
              <dt class="text-slate-500">Multiple:</dt>
              <dd class="font-medium">1</dd>
            </div>
            <div class="flex gap-1.5">
              <dt class="text-slate-500">Min order:</dt>
              <dd class="font-medium">{{ minPriceConfiguration ? minPriceConfiguration.quantity : 0 }}</dd>
            </div>
          </dl>
          <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <UiButton type="button" variant="link" class="h-auto p-0">
              <PDFIcon class="mr-[5px] h-[22px] w-[22px]" />
              <span class="text-xs font-medium leading-tight">Datasheet</span>
            </UiButton>
            <UiButton type="button" variant="link" class="h-auto p-0">
              <LeafIcon class="mr-[5px] h-[22px] w-[22px]" />
              <span class="text-xs font-medium leading-tight">RoHS</span>
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Commerce: pricing + purchase -->
    <div class="mt-4 flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
      <div class="w-full min-w-0 overflow-hidden rounded-lg border border-slate-100 bg-white">
        <div class="grid grid-cols-2 gap-2 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Qty</span>
          <span class="text-right">Price (Ex VAT)</span>
        </div>
        <div
          v-for="[qty, price] in bulkQuantities"
          :key="qty"
          class="grid grid-cols-2 gap-2 border-t border-slate-100 px-3 py-1.5 text-[13px] leading-tight"
        >
          <span class="font-medium text-slate-600">{{ qty }}+</span>
          <span class="text-right font-semibold tabular-nums" :class="[productDiscount ? 'text-rose-500' : 'text-blue-600']">
            {{ formatRegionalPrice(price, currency?.value) }}
          </span>
        </div>
      </div>

      <NuxtLink
        :to="`/product/${item.alias || item._id}`"
        class="w-fit text-sm font-medium text-blue-500 transition-colors hover:text-blue-600"
      >
        View More
      </NuxtLink>

      <div class="flex gap-2.5">
        <QuantityButtons
          v-if="minPriceConfiguration"
          v-model="quantity"
          size="lg"
          :object="{ action: 'update', min: minPriceConfiguration.quantity, id: item._id } as ProductActionObject"
        />
        <UiButton
          type="button"
          :aria-busy="isThisProductAdding"
          :aria-disabled="isThisProductAdding || quantity === 0"
          :disabled="quantity === 0 && !isThisProductAdding"
          size="lg"
          class="flex-1 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          @click="addToCart(item)"
        >
          <CartIcon class="mr-2 h-6 w-6" />
          <span class="text-sm font-medium">{{ isThisProductAdding ? 'Adding…' : 'Add to cart' }}</span>
        </UiButton>
      </div>
    </div>

    <div class="absolute right-4 top-4 hidden flex-col gap-2.5 md:flex md:right-5 md:top-5">
      <UiButton type="button" variant="ghost" size="icon" class="h-6 w-6" aria-label="Save product">
        <HeartIcon class="h-6 w-6" />
      </UiButton>
      <UiButton type="button" variant="ghost" size="icon" class="h-6 w-6" aria-label="Share product">
        <ShareIcon class="h-6 w-6" />
      </UiButton>
    </div>
  </div>
  <LayoutCustomProductPartNumberModal
    v-if="showCustomProductPartNumberModal"
    :manufacturer-code="item.manufacturerCode"
    @close="showCustomProductPartNumberModal = false"
  />
</template>

<script setup lang="ts">
import { MoreHorizontal } from '@lucide/vue';
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
import type { ProductActionObject } from '~~/types/cart';
import { useAuthStore } from '~/store/authStore';
import { useCartStore } from '~/store/cartStore';
import { addToCartHelper, formatRegionalPrice, initializeQuantities, parseProductPriceConfiguration } from '~~/helpers/prices.helper';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~~/types/product';
import { useCart } from '~/composables/useCart';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

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
const regionalPreferencesStore = useRegionalPreferencesStore();
const { isProductAddInFlight } = useCart();
const isThisProductAdding = computed(() => isProductAddInFlight(props.item._id ?? ''));

const { getUserDetails } = storeToRefs(authStore);
const { cart } = storeToRefs(cartStore);
const { currency } = storeToRefs(regionalPreferencesStore);

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
  if (isProductAddInFlight(product._id ?? '')) {
    return;
  }

  const stock = initialRequestedQuantity.value > 0 ? quantity.value - initialRequestedQuantity.value : quantity.value;

  const response = (await addToCartHelper(product, stock, {
    currentCartQuantity: initialRequestedQuantity.value,
    isDelta: initialRequestedQuantity.value > 0,
  })) as { status?: string; changed?: boolean } | null;

  if (response?.status === 'success' && response.changed !== false) {
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
