<template>
  <div class="col-span-2 min-w-0 min-[1440px]:col-span-1">
    <div
      data-testid="product-purchase-panel"
      class="w-full flex flex-col justify-between relative bg-white rounded-2xl shadow-m px-4 py-4 md:px-5 md:py-5 lg:self-start"
    >
      <!-- <div class="absolute top-0 left-0 px-2.5 py-2 flex items-center rounded-tl-md rounded-br-md bg-green-600">
            <CheckCircle2 class="w-4 h-4 mr-1 text-white" />
            <span class="text-[11px] font-Inter leading-tight font-semibold text-white"> {{ product.stock }} in stock </span>
        </div> -->
      <ProductCardStock :stock="product.stock" />
      <UiButton variant="link" class="flex justify-end text-xs my-3 pr-0 lg:hidden px-0" @click="showLargeQuantitiesModal = true">
        For larger quantities ask
        <span
          to="/"
          class="relative text-blue-500 font-medium ml-1 after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-blue-500 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100"
        >
          here.
        </span>
      </UiButton>
      <div class="lg:grid lg:grid-cols-2">
        <div class="lg:order-2 lg:pl-6">
          <div class="flex items-center justify-between gap-3 text-xs leading-tight text-slate-500 rounded-lg bg-slate-50 px-3 py-2.5">
            <div class="flex-shrink-0">Quantity</div>
            <div>Price ( Ex VAT )</div>
          </div>
          <div class="font-Inter mb-4 lg:mb-[25px]">
            <div
              v-for="(bulkQuantity, index) in bulkQuantities"
              :key="index"
              class="flex items-center justify-between gap-3 px-3 py-1 text-xs leading-tight rounded cursor-pointer hover:bg-light-300"
              :class="currentPriceConfiguration?.quantity === bulkQuantity[0] ? 'bg-light-100' : ''"
              @click="quantity = bulkQuantity[0] + 1"
            >
              <div class="text-slate-500">{{ bulkQuantity[0] }}+</div>
              <div :class="['text-neutral-700', productDiscount ? 'text-red' : '']">{{ bulkQuantity[1].toFixed(2) }} Lei</div>
            </div>
          </div>
          <UiButton
            variant="link"
            class="hidden justify-end text-slate-500 text-xs mb-[9px] lg:flex"
            @click="showLargeQuantitiesModal = true"
          >
            For larger quantities ask
            <span
              class="relative text-blue-500 font-medium ml-1 after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-blue-500 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100"
            >
              here.
            </span>
          </UiButton>
        </div>
        <div class="lg:order-1 lg:pt-10 xl:pt-6">
          <div
            class="flex items-center justify-center rounded-lg bg-light-300 px-[13px] py-2 text-xs leading-snug mb-5 lg:flex-col lg:items-start lg:justify-start lg:bg-transparent lg:p-0"
          >
            <div class="flex items-center h-6">
              <span class="text-slate-500 mr-[5px]">Price for:</span>
              <span class="text-neutral-700 font-medium">Each</span>
            </div>
            <div class="flex items-center h-6">
              <span class="text-slate-500 mr-[5px]">Multiple:</span>
              <span class="font-Inter text-neutral-700 font-medium">1</span>
            </div>
            <div class="flex items-center h-6">
              <span class="text-slate-500 mr-[5px]">Minimum Order:</span>
              <span class="font-Inter text-neutral-700 font-medium">{{ minPriceConfiguration ? minPriceConfiguration.quantity : 1 }}</span>
            </div>
          </div>
          <div class="flex items-center justify-between font-Inter mb-4 lg:justify-start lg:items-end">
            <div class="lg:mr-[15px]">
              <div v-if="productDiscount" class="text-sm leading-tight line-through">
                {{ minPriceConfiguration ? `${minPriceConfiguration.price.toFixed(2)} Lei (${minPriceConfiguration.quantity}+)` : '-' }}
              </div>
              <div class="text-xl leading-tight font-semibold" :class="[productDiscount ? 'text-rose-500' : '']">
                <span>
                  {{ discountPrice ? `${discountPrice.toFixed(2)} Lei` : `${minPriceConfiguration?.price.toFixed(2)} Lei` || '-' }}
                </span>
                {{ currentPriceConfiguration ? `(${currentPriceConfiguration.quantity}+)` : '-' }}
              </div>
            </div>
            <div
              v-if="productDiscount"
              class="flex items-center justify-center w-10 h-5 border border-rose-500 text-rose-500 rounded-full font-Inter text-sm leading-tight font-semibold"
            >
              {{ productDiscount }}%
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-2.5 w-full pt-4 self-end border-t border-slate-100 mt-2">
        <div class="min-w-[140px] min-h-[42px]">
          <QuantityButtons
            v-if="minPriceConfiguration"
            v-model="quantity"
            size="lg"
            :object="{ id: product._id, min: minPriceConfiguration.quantity, action: 'update' } as ProductActionObject"
          />
        </div>
        <button
          class="flex items-center flex-1 justify-center bg-blue-500 rounded-lg text-white px-5 py-[9px]"
          @click="addToCart(props.product)"
        >
          <CartIcon class="w-6 h-6 mr-2" />
          <span v-if="minPriceConfiguration && quantity" class="text-sm font-medium"
            >{{ quantity > minPriceConfiguration.quantity ? 'Update' : 'Add to' }} cart</span
          >
        </button>
      </div>
    </div>
    <ProductLargeQuantitiesModal v-model="showLargeQuantitiesModal" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import CartIcon from '@/assets/icons/cart.svg';
import type { CartInterface, ProductActionObject } from '~/types/cart';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~/model/products/response/ProductResponse';
import { addToCartHelper, initializeQuantities, parseProductPriceConfiguration } from '~/helpers/prices.helper';
import { useAuthStore } from '~/store/authStore';
import { useCartStore } from '~/store/cartStore';

const authStore = useAuthStore();
const cartStore = useCartStore();

const { getUserDetails } = storeToRefs(authStore);
const { getCart } = storeToRefs(cartStore);

const props = defineProps<{
  product: ProductInterface;
}>();

const quantity = ref(0);
const initialRequestedQuantity = ref(0);

const minPriceConfiguration = ref<PriceConfigurationSettingsInterface | undefined>(undefined);
const currentPriceConfiguration = ref<PriceConfigurationSettingsInterface | undefined>(undefined);
const discountPrice = ref(0);
const userDiscount = ref(0);
const productDiscount = ref(0);

const getPricesConfiguration = () => {
  const discountsHelper = parseProductPriceConfiguration(props.product, getUserDetails.value, quantity.value);

  minPriceConfiguration.value = discountsHelper?.minimumOrderQuantityConfiguration;
  currentPriceConfiguration.value = discountsHelper?.priceConfiguration;
  discountPrice.value = discountsHelper?.discountPrice || 0;
  userDiscount.value = discountsHelper?.userDiscount || 0;
  productDiscount.value = discountsHelper?.productDiscount || 0;
};

const fetchCart = async () => {
  const data = (await getCart.value) as CartInterface;

  // getPricesConfiguration();
  if (minPriceConfiguration.value) {
    initializeQuantities(props.product, data, quantity, initialRequestedQuantity, minPriceConfiguration.value);
  }
  getPricesConfiguration();
};

await fetchCart();

const bulkQuantities = new Map<number, number>();

const buildBulkQuantities = () => {
  if (!props.product.priceConfiguration) {
    return;
  }

  props.product.priceConfiguration.configuration.forEach((configuration: PriceConfigurationSettingsInterface) => {
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

watch(quantity, (_quantity) => {
  getPricesConfiguration();
});

buildBulkQuantities();

const showLargeQuantitiesModal = ref(false);
</script>
