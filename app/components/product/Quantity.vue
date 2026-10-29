<template>
  <div class="col-span-2 min-w-0 h-full xl:col-span-1">
    <div
      data-testid="product-purchase-panel"
      class="relative flex h-full w-full flex-col bg-card rounded-2xl shadow-m px-4 py-4 md:px-5 md:py-5"
    >
      <!-- <div class="absolute top-0 left-0 px-2.5 py-2 flex items-center rounded-tl-md rounded-br-md bg-green-600">
            <CheckCircle2 class="w-4 h-4 mr-1 text-white" />
            <span class="text-[11px] font-Inter leading-tight font-semibold text-white"> {{ product.stock }} in stock </span>
        </div> -->
      <div class="min-h-0 flex-1">
        <ProductCardStock :stock="product.stock" />
        <UiButton variant="link" class="flex justify-end text-xs my-1 pr-0 lg:hidden px-0 md:my-3" @click="showLargeQuantitiesModal = true">
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
            <div
              class="flex items-center justify-between gap-3 text-xs leading-tight text-muted-foreground rounded-lg bg-muted px-3.5 py-3"
            >
              <div class="flex-shrink-0">Quantity</div>
              <div>Price (ex VAT)</div>
            </div>
            <div class="font-Inter mt-1.5 mb-6 space-y-1 lg:mb-[25px]">
              <details v-if="bulkQuantities.size" class="mb-2 rounded-lg border border-border px-3.5 py-1 md:hidden md:py-2">
                <summary class="cursor-pointer text-xs font-medium leading-5 text-muted-foreground">Volume prices</summary>
                <div class="mt-2">
                  <div
                    v-for="(bulkQuantity, index) in bulkQuantities"
                    :key="index"
                    class="flex items-center justify-between gap-3 border-t border-border py-2 text-xs leading-tight"
                  >
                    <span class="text-muted-foreground">{{ bulkQuantity[0] }}+</span>
                    <span :class="['text-foreground', productDiscount ? 'text-red' : '']">{{ bulkQuantity[1].toFixed(2) }} Lei</span>
                  </div>
                </div>
              </details>
              <div class="hidden md:block">
                <div
                  v-for="(bulkQuantity, index) in bulkQuantities"
                  :key="index"
                  class="flex items-center justify-between gap-3 px-3.5 py-3 text-xs leading-tight rounded-md cursor-pointer hover:bg-accent"
                  :class="currentPriceConfiguration?.quantity === bulkQuantity[0] ? 'bg-muted' : ''"
                  @click="quantity = bulkQuantity[0]"
                >
                  <div class="text-muted-foreground">{{ bulkQuantity[0] }}+</div>
                  <div :class="['text-foreground', productDiscount ? 'text-red' : '']">{{ bulkQuantity[1].toFixed(2) }} Lei</div>
                </div>
              </div>
            </div>
            <UiButton
              variant="link"
              class="hidden justify-end text-muted-foreground text-xs mb-[9px] lg:flex"
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
              class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg bg-accent px-3.5 py-3.5 text-xs leading-snug mb-4 md:mb-8 lg:mb-5 lg:flex-col lg:items-start lg:justify-start lg:gap-0 lg:bg-transparent lg:p-0"
            >
              <div class="flex items-center gap-1 min-h-6">
                <span class="text-muted-foreground">Price for:</span>
                <span class="text-foreground font-medium">Each</span>
              </div>
              <div class="flex items-center gap-1 min-h-6">
                <span class="text-muted-foreground">Multiple:</span>
                <span class="font-Inter text-foreground font-medium">1</span>
              </div>
              <div class="flex items-center gap-1 min-h-6">
                <span class="text-muted-foreground">Minimum Order:</span>
                <span class="font-Inter text-foreground font-medium">{{ minPriceConfiguration ? minPriceConfiguration.quantity : 1 }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between font-Inter mb-4 lg:justify-start lg:items-end">
              <div class="lg:mr-[15px]">
                <div v-if="productDiscount" class="text-sm leading-tight line-through">
                  {{ minPriceConfiguration ? `${minPriceConfiguration.price.toFixed(2)} Lei (${minPriceConfiguration.quantity}+)` : '-' }}
                </div>
                <div class="text-xl leading-tight font-semibold" :class="[productDiscount ? 'text-red-700' : '']">
                  <span>
                    {{
                      discountPrice
                        ? `${discountPrice.toFixed(2)} Lei`
                        : minPriceConfiguration
                          ? `${minPriceConfiguration.price.toFixed(2)} Lei`
                          : '-'
                    }}
                  </span>
                  {{ currentPriceConfiguration ? `(${currentPriceConfiguration.quantity}+)` : '-' }}
                </div>
              </div>
              <div
                v-if="productDiscount"
                class="flex items-center justify-center w-10 h-5 border border-red-700 text-red-700 rounded-full font-Inter text-sm leading-tight font-semibold"
              >
                {{ productDiscount }}%
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-auto flex w-full shrink-0 flex-col gap-2 border-t border-border pt-4">
        <div class="flex w-full gap-2.5">
          <div class="min-h-11 min-w-[140px]">
            <QuantityButtons
              v-if="minPriceConfiguration"
              v-model="quantity"
              size="lg"
              :object="
                { id: product._id, min: minPriceConfiguration.quantity, max: product.stock, action: 'update' } as ProductActionObject
              "
            />
          </div>
          <UiButton
            type="button"
            class="min-h-11 flex-1 px-5 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            :aria-label="cartButtonLabel"
            :aria-busy="!isCartReady || isAddingToCart"
            :aria-disabled="isAddingToCart"
            :aria-describedby="showAlreadyInCartMessage ? 'cart-qty-unchanged-hint' : undefined"
            :disabled="isCartButtonDisabled && !isAddingToCart"
            @click="addToCart(props.product)"
          >
            <CartIcon class="w-6 h-6 mr-2" />
            <span v-if="minPriceConfiguration && quantity" class="text-sm font-medium">
              {{ cartButtonLabel }}
            </span>
          </UiButton>
        </div>
        <p
          id="cart-qty-unchanged-hint"
          data-testid="cart-qty-unchanged-hint"
          class="min-h-[1.125rem] text-xs leading-snug text-muted-foreground"
          :class="{ invisible: !showAlreadyInCartMessage }"
          :aria-hidden="!showAlreadyInCartMessage"
        >
          Already in your cart (qty {{ initialRequestedQuantity }})
        </p>
      </div>
    </div>
    <ProductLargeQuantitiesModal v-model="showLargeQuantitiesModal" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import CartIcon from '@/assets/icons/cart.svg';
import type { ProductActionObject } from '~~/types/cart';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~~/types/product';
import { addToCartHelper, clampCartQuantity, initializeQuantities, parseProductPriceConfiguration } from '~~/helpers/prices.helper';
import { toast } from '~/components/ui/toast';
import { useAuthStore } from '~/store/authStore';
import { useCartStore } from '~/store/cartStore';
import { useCart } from '~/composables/useCart';

const authStore = useAuthStore();
const cartStore = useCartStore();
const { isProductAddInFlight } = useCart();

const { getUserDetails } = storeToRefs(authStore);
const { getCart } = storeToRefs(cartStore);

const props = defineProps<{
  product: ProductInterface;
}>();

const quantity = ref(0);
const initialRequestedQuantity = ref(0);
const isLocalAddingToCart = ref(false);
const isAddingToCart = computed(() => isLocalAddingToCart.value || isProductAddInFlight(props.product._id ?? ''));
const isCartReady = ref(false);
const isInCart = computed(() => initialRequestedQuantity.value > 0);
const cartButtonLabel = computed(() => {
  if (!isCartReady.value) return 'Loading cart…';
  if (isAddingToCart.value) return 'Adding…';
  return isInCart.value ? 'Update cart' : 'Add to cart';
});
// Add stays enabled at the min qty when the line is absent. Update disables only when
// qty matches the cart baseline (no-op delta). Do not use quantity === initial when
// initial is 0 — that would block first-unit Add during edge/loading states.
const isCartButtonDisabled = computed(
  () =>
    !isCartReady.value ||
    isAddingToCart.value ||
    quantity.value < 1 ||
    (isInCart.value && quantity.value === initialRequestedQuantity.value),
);
// Explain disabled Update cart when qty matches the in-cart baseline (no-op).
const showAlreadyInCartMessage = computed(
  () => isCartReady.value && !isAddingToCart.value && isInCart.value && quantity.value === initialRequestedQuantity.value,
);

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
  // Always refresh from the API. Persisted Pinia cart alone can mark a product as
  // already in cart and disable "Add to cart" at qty 1 when the server cart is empty.
  const data = (await cartStore.updateAndReturnCart()) ?? getCart.value;

  if (minPriceConfiguration.value) {
    initializeQuantities(props.product, data, quantity, initialRequestedQuantity, minPriceConfiguration.value);
  } else {
    initialRequestedQuantity.value = 0;
  }
  getPricesConfiguration();
  isCartReady.value = true;
};

getPricesConfiguration();
quantity.value = minPriceConfiguration.value?.quantity || 1;
onMounted(() => void fetchCart());

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
  if (isAddingToCart.value) {
    return;
  }

  isLocalAddingToCart.value = true;
  const wasInCart = isInCart.value;
  const stock = initialRequestedQuantity.value > 0 ? quantity.value - initialRequestedQuantity.value : quantity.value;

  try {
    const response = (await addToCartHelper(product, stock, {
      currentCartQuantity: initialRequestedQuantity.value,
      isDelta: initialRequestedQuantity.value > 0,
    })) as { status?: string; changed?: boolean } | null;

    if (response?.status === 'success' && response.changed !== false) {
      await fetchCart();
      // The header badge pulses, but nothing announces the change for keyboard and screen-reader users.
      toast({
        variant: 'success',
        title: wasInCart ? 'Cart updated' : 'Added to cart',
        description: product.name,
      });
    }
  } finally {
    isLocalAddingToCart.value = false;
  }
};

watch(quantity, (nextQuantity) => {
  const { stock: clampedStock, wasClamped, maxStock } = clampCartQuantity(props.product, nextQuantity);

  if (wasClamped) {
    quantity.value = clampedStock;
    toast({
      title: 'Limited stock',
      description: `Only ${maxStock} items are available. Quantity was adjusted to ${clampedStock}.`,
      variant: 'default',
    });
  }

  getPricesConfiguration();
});

buildBulkQuantities();

const showLargeQuantitiesModal = ref(false);
</script>
