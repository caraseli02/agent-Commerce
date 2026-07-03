<template>
  <div v-if="isLoadingCheckout">
    <UiSkeleton class="h-full w-full absolute inset-0 z-50" />
    <LoaderIcon class="absolute top-[50%] left-[50%] z-50 animate-spin" />
  </div>
  <div v-else class="pt-[30px] lg:pt-10">
    <div class="grid grid-cols-1">
      <div class="container px-4">
        <div v-if="!userId" class="mb-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-4 text-blue-800">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
            <InfoIcon class="w-6 h-6" />
          </div>
          <div class="flex-1">
            <p class="font-bold text-sm md:text-base">Viewing Summary as Guest</p>
            <p class="text-xs md:text-sm opacity-90">
              Review your items and configuration here. To finalize the order and apply business discounts, please
              <NuxtLink :to="signinHref" class="underline hover:text-blue-900 transition-colors font-bold"> Sign In </NuxtLink>
            </p>
          </div>
        </div>
        <OrderSummaryHeader />
        <div class="gap-6 xl:grid xl:grid-cols-[1fr,392px]">
          <div class="flex flex-col gap-9 max-w-[992px]">
            <OrderSummaryBackOrderWarning v-if="showWarning" />
            <OrderSummaryTable :loading="loading" @update-subtotal="updateSubtotal($event, order)" @delete-selected="deleteSelected" />
            <div class="hidden lg:flex flex-col">
              <OrderSummarySimilarProducts :loading="loading" />
              <OrderSummaryBannerImageCard class="hidden xl:flex" />
            </div>
          </div>
          <div class="flex flex-col justify-start">
            <OrderStockType
              :items="cartItems"
              :account-credit="accountCredit"
              :order="order"
              :shipping-preferences="shippingPreferences"
              @update-payment-details="order.paymentDetails = $event"
            />
            <OrderSummaryNoteSection />
            <OrderSummary :order="order" :general-settings="generalSettings" />
            <OrderSummaryCheckoutButtons
              :is-checkout-disabled="isCheckoutDisabled"
              :is-guest-checkout="!userId"
              :signin-href="signinHref"
            />
            <OrderSummaryBannerCard />
            <OrderSummaryEcxlusiveOffer class="max-lg:hidden" />
            <OrderSummarySimilarProducts :loading="loading" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { InfoIcon, LoaderIcon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import Emitter from 'tiny-emitter/instance.js';
import { useHead, useRouter, useRuntimeConfig } from '#app';
import OrderStockType from '~/components/order-summary/OrderStockType.vue';

// Types and Interfaces
import type { CartProductsInterface } from '~/model/cart/response/cart.interface';
import { OrderType, PaymentTypeEnum, type CheckoutOrderDraft, type PaymentDetails } from '~/types';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';
import type { UserInterface } from '~/types/auth/user-interface';

// Composables
import { useUser } from '~/composables/useUser';
import { useCart } from '~/composables/useCart';
import { usePaymentCards } from '~/composables/usePaymentCards';
import { useOrder } from '~/composables/useOrder';
import { fetchCustomerCredit } from '~/composables/api/user';

// Stores
import { useAuthStore } from '~/store/authStore';
import { useCheckoutStore } from '~/store/checkoutStore';

// Utilities
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';
import type { ShippingOrderPricingResponse } from '~/types/order-summary/shipping-services';

// Setup and Initialization
const router = useRouter();
useHead({ title: 'Order Summary' });

// User Information
const { user, getShipping, getBilling } = useUser();
const userId = computed(() => user.value?.firebaseId);

// Cart Management
const { cartId, cartItems, fetchList, calculateSubtotal, calculateDiscount, showWarning, fetchShippingPrices } = useCart();

const orderItems = computed(() => {
  return cartItems.value.map((item) => {
    const { selected, liked, ...rest } = item;
    const quantity = Number(item.stock || 0) + Number(item.backorder_stock || 0);
    const discountPrice = item.productEntity
      ? Number(
          parseProductPriceConfiguration(item.productEntity, user.value as UserInterface, quantity)?.currentConfigurationDiscountPrice || 0
        )
      : 0;
    const effectiveUnitPrice = Number(discountPrice || item.unitPriceAfterDiscounts || item.initialUnitPrice || 0);
    const lineTotal = Number((effectiveUnitPrice * quantity).toFixed(2));

    return {
      ...rest,
      initialUnitPrice: effectiveUnitPrice,
      unitPriceAfterDiscounts: effectiveUnitPrice,
      subtotal: lineTotal,
      total: lineTotal,
    } as CartProductsInterface;
  });
});

// Payment Processing
const { card, cards, fetchCards } = usePaymentCards();
const paymentType = ref({ type: 0, selected: false });

// Order Processing
const { makeCheckout } = useOrder();
const orderType = ref(0);
const note = ref('');

const order = ref<CheckoutOrderDraft>({
  total: 0,
  subtotal: 0,
  products: orderItems.value,
  discount: { value: 0, total: 0 },
  shippingDetails: {
    address: getShipping(),
    billingAddress: getBilling(),
  },
  paymentDetails: {} as PaymentDetails,
  type: OrderType.Stock,
  backorderOption: null,
  deliveryMethod: null,
  smallOrder: null,
});

// General Settings
const authStore = useAuthStore();
const { getGeneralSettings } = storeToRefs(authStore);
const generalSettings = computed(() => getGeneralSettings.value);

// Account Credit
const loading = ref(true);
const accountCredit = ref<CustomerCreditInterface>({
  limit: 0,
  spent: 0,
  available: 0,
  dueDate: '',
  tillDue: '',
  term: 0,
  freeze: false,
  active: false,
});

const getCustomerCredit = async () => {
  const config = useRuntimeConfig();
  if (!userId.value && !config.public.MOCK_MODE) return;

  const idToUse = userId.value || 'guest-user-session';

  try {
    const response = (await fetchCustomerCredit(idToUse)) as {
      status: string;
      data?: CustomerCreditInterface;
    };

    if (response.status === 'success' && response.data) {
      const creditData = response.data;
      accountCredit.value = {
        limit: creditData.limit,
        spent: creditData.spent,
        available: creditData.available,
        dueDate: creditData.dueDate,
        tillDue: creditData.tillDue,
        term: creditData.term,
        freeze: creditData.freeze ?? false,
        active: creditData.active ?? false,
      };
    }
  } catch {
    return;
  } finally {
    loading.value = false;
  }
};

const shippingPreferences = ref(null as ShippingOrderPricingResponse | null);
const syncCheckoutProducts = () => {
  order.value.products = orderItems.value;
  order.value.subtotal = Number(orderItems.value.reduce((sum, item) => sum + Number(item.subtotal || 0), 0).toFixed(2));
  order.value.discount.total = 0;
};
const syncOrderTotals = () => {
  syncCheckoutProducts();
  const subtotal = Number(order.value.subtotal || 0);
  const vat = Number((subtotal * 0.19).toFixed(2));
  const shippingFee = Number(order.value.deliveryMethod?.price?.total || 0);
  const smallOrderFee = Number(order.value.smallOrder?.price || 0);

  order.value.total = Number((subtotal + vat + shippingFee + smallOrderFee).toFixed(2));
  order.value.shippingCost = shippingFee;
};
const signinHref = computed(() => {
  const routePath = router.currentRoute.value.fullPath || '/order-summary';
  return `/?signin=true&redirect=${encodeURIComponent(routePath)}`;
});

const applyMockCheckoutDefaults = () => {
  const config = useRuntimeConfig();

  if (!config.public.MOCK_MODE || !userId.value) {
    return;
  }

  if (!order.value.deliveryMethod) {
    const firstDeliveryMethod = shippingPreferences.value?.list?.find((option) => option?.service);
    if (firstDeliveryMethod) {
      order.value.deliveryMethod = firstDeliveryMethod;
    }
  }

  if (!order.value.backorderOption && (order.value.type === OrderType.Back || order.value.type === OrderType.Mixed)) {
    const firstBackorderOption = generalSettings.value?.orderSettings?.backorderShippingTypes?.find((option) => option.active);
    if (firstBackorderOption) {
      order.value.backorderOption = firstBackorderOption;
    }
  }

  if (!order.value.paymentDetails || !('type' in order.value.paymentDetails)) {
    if (card.value?.id) {
      order.value.paymentDetails = {
        type: PaymentTypeEnum.Card,
        card: card.value,
      };
      return;
    }

    const firstCard = cards.value.find((savedCard) => savedCard.id);
    if (firstCard) {
      order.value.paymentDetails = {
        type: PaymentTypeEnum.Card,
        card: firstCard,
      };
    }
  }
};

// Checkout Control
const checkoutStore = useCheckoutStore();
const { checkout } = storeToRefs(checkoutStore);
const stopButtonTrigger = ref(true);

const isCheckoutDisabled = computed(() => {
  const hasShippingAddress = !!order.value.shippingDetails.address;
  const hasBillingAddress = !!order.value.shippingDetails.billingAddress;
  const hasShippingPreference = !!order.value.deliveryMethod;
  const hasPaymentMethod = !!order.value.paymentDetails && 'type' in order.value.paymentDetails;

  return !(hasShippingAddress && hasBillingAddress && hasShippingPreference && hasPaymentMethod);
});

const isLoadingCheckout = ref(false);
watch(checkout, async (newVal) => {
  if (newVal && stopButtonTrigger.value) {
    try {
      isLoadingCheckout.value = true;
      await makeCheckout(
        orderType.value,
        cartId.value,
        order.value.deliveryMethod,
        order.value.backorderOption,
        order.value.smallOrder,
        order.value.paymentDetails,
        note.value,
        {
          products: order.value.products,
          subtotal: Number(order.value.subtotal || 0),
          total: Number(order.value.total || 0),
        }
      );
      stopButtonTrigger.value = false;
    } catch {
      isLoadingCheckout.value = false;
    }
    isLoadingCheckout.value = false;
  }
});

// Event Handling
Emitter.on('order-type', (type: number) => {
  orderType.value = type;
});

Emitter.on('payment-type', (object: { type: number; selected: boolean }) => {
  paymentType.value = { ...object };
});

Emitter.on('note', (noteText: string) => {
  note.value = noteText;
});

Emitter.on('delete-product-item', (object: { id: string }) => {
  cartItems.value = cartItems.value.filter((product) => product.id !== object.id);
});

const deleteSelected = () => {
  cartItems.value = cartItems.value.filter((item) => !item.selected);
};

const updateSubtotal = async (items: CartProductsInterface[], checkoutOrder: CheckoutOrderDraft) => {
  shippingPreferences.value = await fetchShippingPrices(checkoutOrder);
  await calculateSubtotal(items, checkoutOrder);
  syncOrderTotals();
};

// Watches and Reactions
watch(
  cartItems,
  async () => {
    await calculateSubtotal(cartItems.value, order.value);
    calculateDiscount(cartItems.value, order);
    syncOrderTotals();
    applyMockCheckoutDefaults();
  },
  { deep: true }
);

watch(
  [shippingPreferences, cards],
  () => {
    syncOrderTotals();
    applyMockCheckoutDefaults();
  },
  { deep: true }
);

watch(
  () => order.value.type,
  () => {
    syncOrderTotals();
    applyMockCheckoutDefaults();
  }
);

// Initialization
onMounted(async () => {
  const shippingPricesPromise = fetchShippingPrices(order.value);

  const [, , , shippingPrices] = await Promise.all([
    fetchCards(), // Fetch user's payment cards
    getCustomerCredit(), // Fetch customer credit information
    fetchList(), // Fetch cart items
    shippingPricesPromise,
  ]);

  shippingPreferences.value = shippingPrices; // Fetch shipping prices

  // Initial calculations
  await calculateSubtotal(cartItems.value, order.value);
  calculateDiscount(cartItems.value, order);

  syncOrderTotals();
  applyMockCheckoutDefaults();
  loading.value = false;
});
</script>
