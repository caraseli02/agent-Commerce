<template>
  <OrderSummaryPageSkeleton v-if="!isClientReady || isLoadingCheckout" :show-guest-banner="isGuestCheckout" />
  <div v-else class="pt-[30px] lg:pt-10">
    <div class="grid grid-cols-1">
      <div class="container px-4">
        <div
          v-if="!cartReadError && !isCartEmpty && isGuestCheckout && !guestCheckoutMode"
          class="mb-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-4 text-blue-800"
        >
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
            <InfoIcon class="w-6 h-6" />
          </div>
          <div class="flex-1">
            <p class="font-bold text-sm md:text-base">Viewing Summary as Guest</p>
            <p class="text-xs md:text-sm opacity-90">
              Review your items and configuration here. To finalize the order and apply business discounts, please
              <NuxtLink :to="signinHref" class="underline hover:text-blue-900 transition-colors font-bold"> Sign In </NuxtLink>
              or choose Checkout as Guest below.
            </p>
          </div>
        </div>
        <div
          v-else-if="!cartReadError && !isCartEmpty && isGuestCheckoutMode"
          class="mb-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-4 text-emerald-900"
        >
          <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <InfoIcon class="w-6 h-6" />
          </div>
          <div class="flex-1">
            <p class="font-bold text-sm md:text-base">Checking out as Guest</p>
            <p class="text-xs md:text-sm opacity-90">
              Enter your contact and address details below to complete your order without an account.
              <NuxtLink :to="signinHref" class="underline hover:text-emerald-950 transition-colors font-bold">Sign in</NuxtLink>
              if you have a saved profile.
            </p>
          </div>
        </div>
        <OrderSummaryHeader v-if="!cartReadError && !isCartEmpty" />
        <div v-if="cartReadError" class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          <p class="font-semibold">We could not load your cart</p>
          <p class="mt-1 text-sm">Try again before continuing checkout.</p>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <UiButton type="button" @click="refreshCartRead()">Try again</UiButton>
            <NuxtLink to="/search" class="min-h-11 inline-flex items-center font-medium text-blue-700 underline underline-offset-4">
              Continue shopping
            </NuxtLink>
          </div>
        </div>
        <section
          v-else-if="isCartEmpty"
          class="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center shadow-sm sm:px-8 sm:py-10"
        >
          <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Your cart is empty</h1>
          <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Add a component to your cart to review pricing, delivery options, and checkout details.
          </p>
          <NuxtLink
            to="/search"
            class="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Browse components
          </NuxtLink>
        </section>
        <div v-else class="gap-6 xl:grid xl:grid-cols-[1fr_392px]">
          <div class="flex flex-col gap-9 max-w-[992px]">
            <OrderSummaryBackOrderWarning v-if="showWarning" />
            <OrderSummaryTable
              :loading="loading || cartReadPending"
              :quote="authoritativeQuote"
              @update-subtotal="updateSubtotal($event, order)"
              @delete-selected="deleteSelected"
            />
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
              :requires-payment-reselection="requiresPaymentReselection"
              :shipping-preferences="shippingPreferences"
              @update-payment-details="updatePaymentDetails"
            />
            <OrderSummaryNoteSection />
            <OrderSummary :order="order" :quote="authoritativeQuote" />
            <OrderSummaryCheckoutButtons
              :is-checkout-disabled="isCheckoutDisabled"
              :is-guest-checkout="isGuestCheckout"
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
import { cartReadCacheKey, loadCartRead } from '~/composables/loadCartRead';
import { InfoIcon } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import Emitter from 'tiny-emitter/instance.js';
import { useHead, useRouter, useRuntimeConfig } from '#app';
import OrderStockType from '~/components/order-summary/OrderStockType.vue';

// Types and Interfaces
import type { CartProductsInterface } from '~~/types/cart';
import { OrderType, PaymentTypeEnum, type CheckoutOrderDraft, type PaymentDetails } from '~~/types';
import type { CustomerCreditInterface } from '~~/types/auth/account-settings';
import type { UserInterface } from '~~/types/auth/user-interface';

// Composables
import { useUser } from '~/composables/useUser';
import { useCart } from '~/composables/useCart';
import { usePaymentCards } from '~/composables/usePaymentCards';
import { useOrder } from '~/composables/useOrder';
import { useGuestCheckout } from '~/composables/useGuestCheckout';
import { fetchCustomerCredit } from '~/composables/api/user';
import { fetchSettings } from '~/composables/api/settings';

// Stores
import { useAuthStore } from '~/store/authStore';
import { useCheckoutStore } from '~/store/checkoutStore';

// Utilities
import { parseProductPriceConfiguration } from '~~/helpers/prices.helper';
import { createEmptyGuestAddress, isCompleteGuestContact, isCompleteSavedAddress } from '~~/helpers/address.helper';
import { canSkipAuthenticatedUser, isDemoCheckoutAssistEnabled } from '~~/helpers/mock-integration';
import type { ShippingOrderPricingResponse } from '~~/types/order-summary/shipping-services';

// Setup and Initialization
const router = useRouter();
useHead({ title: 'Order Summary' });
const isClientReady = useClientReady();

// User Information
const { user, getShipping, getBilling } = useUser();
const userId = computed(() => user.value?.firebaseId);
// Cookie token is SSR-safe; userDetails only restores from localStorage after client hydrate.
const authStore = useAuthStore();
const { token, getGeneralSettings } = storeToRefs(authStore);
const isGuestCheckout = computed(() => !(token.value || userId.value));
const { guestCheckoutMode, clearGuestCheckout } = useGuestCheckout();
const isGuestCheckoutMode = computed(() => isGuestCheckout.value && guestCheckoutMode.value);
const authoritativeQuote = ref<ShippingOrderPricingResponse['quote']>(undefined);
const checkoutReview = ref<ShippingOrderPricingResponse['review']>();
const CHECKOUT_DRAFT_STORAGE_KEY = 'checkout-draft-v1';
const restoredCardId = ref<string | null>(null);
const requiresPaymentReselection = ref(false);

// Cart Management — refreshCart goes through loadCartRead + cartStore.updateAndReturnCart
// (sets hasFetchedCart) so pages never call composables/api/cart directly.
const { cartId, cartItems, showWarning, fetchShippingPrices, refreshCart } = useCart();

const {
  pending: cartReadPending,
  error: cartReadError,
  refresh: refreshCartRead,
} = useAsyncData(cartReadCacheKey('order-summary'), () => loadCartRead(() => refreshCart()), { server: false });
const isCartEmpty = computed(() => !cartReadPending.value && !cartReadError.value && cartItems.value.length === 0);

const orderItems = computed(() => {
  return cartItems.value.map((item) => {
    const { selected, liked, ...rest } = item;
    const quantity = Number(item.stock || 0) + Number(item.backorder_stock || 0);
    const discountPrice = item.productEntity
      ? Number(
          parseProductPriceConfiguration(item.productEntity, user.value as UserInterface, quantity)?.currentConfigurationDiscountPrice || 0,
        )
      : 0;
    const effectiveUnitPrice = Number(discountPrice || item.unitPriceAfterDiscounts || item.initialUnitPrice || 0);
    const quotedLine = authoritativeQuote.value?.lines.find((line) => line.productId === item.id);
    const unitPrice = quotedLine?.unitPrice ?? effectiveUnitPrice;
    const lineTotal = quotedLine?.lineTotal ?? Number((unitPrice * quantity).toFixed(2));
    const listUnitPrice = quotedLine?.listUnitPrice ?? unitPrice;

    return {
      ...rest,
      initialUnitPrice: listUnitPrice,
      unitPriceAfterDiscounts: unitPrice,
      discount: quotedLine
        ? {
            value: quotedLine.discountPercent,
            startDate: '',
            endDate: '',
          }
        : rest.discount,
      subtotal: lineTotal,
      vatTotal: quotedLine?.vatTotal,
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
  guestContact: null,
  paymentDetails: {} as PaymentDetails,
  type: OrderType.Stock,
  backorderOption: null,
  deliveryMethod: null,
  smallOrder: null,
});

// A refresh must not silently discard a buyer's selected payment, delivery, or
// guest contact/address data. Keep the draft only for this browser session and
// never persist card details.
const restoreCheckoutDraft = () => {
  if (!import.meta.client) return;
  try {
    const draft = JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY) || '{}') as Partial<CheckoutOrderDraft>;
    if (draft.shippingDetails) order.value.shippingDetails = draft.shippingDetails;
    if (draft.guestContact) order.value.guestContact = draft.guestContact;
    if (draft.deliveryMethod) order.value.deliveryMethod = draft.deliveryMethod;
    if (draft.backorderOption) order.value.backorderOption = draft.backorderOption;
    if (draft.paymentDetails?.type !== undefined) {
      order.value.paymentDetails = { type: draft.paymentDetails.type } as PaymentDetails;
      const storedCardId = (draft.paymentDetails as PaymentDetails & { cardId?: unknown }).cardId;
      restoredCardId.value = typeof storedCardId === 'string' ? storedCardId : null;
    }
  } catch {
    sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
  }
};

const persistCheckoutDraft = () => {
  if (!import.meta.client) return;
  if (isGuestCheckout.value && !guestCheckoutMode.value) {
    sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(
    CHECKOUT_DRAFT_STORAGE_KEY,
    JSON.stringify({
      shippingDetails: order.value.shippingDetails,
      guestContact: order.value.guestContact,
      deliveryMethod: order.value.deliveryMethod,
      backorderOption: order.value.backorderOption,
      paymentDetails:
        order.value.paymentDetails?.type === undefined
          ? undefined
          : { type: order.value.paymentDetails.type, cardId: order.value.paymentDetails.card?.id },
    }),
  );
};

// General Settings
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
  if (!canSkipAuthenticatedUser(Boolean(config.public.MOCK_MODE), Boolean(userId.value))) return;

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
  } catch (error) {
    console.error('Failed to fetch customer credit:', error);
  } finally {
    loading.value = false;
  }
};

const shippingPreferences = ref(null as ShippingOrderPricingResponse | null);
const syncCheckoutProducts = () => {
  order.value.products = orderItems.value;
  const quote = authoritativeQuote.value;
  if (!quote) return;

  order.value.subtotal = quote.merchandiseTotal;
  order.value.discount.total = quote.discountTotal;
  const discountPercentages = new Set(quote.lines.map((line) => line.discountPercent));
  order.value.discount.value = discountPercentages.size === 1 ? (quote.lines[0]?.discountPercent ?? 0) : 0;
};
const syncOrderTotals = () => {
  syncCheckoutProducts();
  const quote = authoritativeQuote.value;
  if (!quote) return;

  order.value.total = quote.grandTotal;
  order.value.shippingCost = quote.shippingTotal;
};
const signinHref = computed(() => {
  const routePath = router.currentRoute.value.fullPath || '/order-summary';
  return `/?signin=true&redirect=${encodeURIComponent(routePath)}`;
});

const applyMockCheckoutDefaults = () => {
  const config = useRuntimeConfig();

  if (!isDemoCheckoutAssistEnabled(Boolean(config.public.MOCK_MODE))) {
    return;
  }

  if (!userId.value && !isGuestCheckoutMode.value) {
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

  if ((!order.value.paymentDetails || !('type' in order.value.paymentDetails)) && !requiresPaymentReselection.value) {
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
      return;
    }

    order.value.paymentDetails = {
      type: PaymentTypeEnum.Bank,
    };
  }
};

const restoreSavedCardSelection = () => {
  if (order.value.paymentDetails?.type !== PaymentTypeEnum.Card || !restoredCardId.value) return;
  const savedCard = cards.value.find((candidate) => candidate.id === restoredCardId.value);
  if (savedCard) {
    order.value.paymentDetails = { type: PaymentTypeEnum.Card, card: savedCard };
  } else {
    order.value.paymentDetails = {} as PaymentDetails;
    requiresPaymentReselection.value = true;
  }
  restoredCardId.value = null;
};

const updatePaymentDetails = (paymentDetails: PaymentDetails) => {
  order.value.paymentDetails = paymentDetails;
  requiresPaymentReselection.value = false;
};

// Checkout Control
const checkoutStore = useCheckoutStore();
const { checkout } = storeToRefs(checkoutStore);
const stopButtonTrigger = ref(true);

const isCheckoutDisabled = computed(() => {
  const hasShippingAddress = isCompleteSavedAddress(order.value.shippingDetails.address);
  const hasBillingAddress = isCompleteSavedAddress(order.value.shippingDetails.billingAddress);
  const hasShippingPreference = !!order.value.deliveryMethod;
  const hasPaymentMethod = !!order.value.paymentDetails && 'type' in order.value.paymentDetails;
  const hasGuestContact = !isGuestCheckoutMode.value || isCompleteGuestContact(order.value.guestContact);
  const hasAuthoritativeQuote = Boolean(
    authoritativeQuote.value &&
    authoritativeQuote.value.lines.length === cartItems.value.length &&
    authoritativeQuote.value.lines.every((line) => {
      const item = cartItems.value.find((candidate) => candidate.id === line.productId);
      return item && line.quantity === Number(item.stock || 0) + Number(item.backorder_stock || 0);
    }),
  );

  return !(
    hasShippingAddress &&
    hasBillingAddress &&
    hasShippingPreference &&
    hasPaymentMethod &&
    hasGuestContact &&
    hasAuthoritativeQuote
  );
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
          guestContact: order.value.guestContact,
          shippingDetails: order.value.shippingDetails,
        },
        checkoutReview.value,
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

let quoteRequestVersion = 0;
const refreshAuthoritativePricing = async () => {
  const requestVersion = ++quoteRequestVersion;

  if (!cartId.value || !cartItems.value.length) {
    authoritativeQuote.value = undefined;
    checkoutReview.value = undefined;
    return;
  }

  authoritativeQuote.value = undefined;
  let response: ShippingOrderPricingResponse | null = null;
  try {
    response = await fetchShippingPrices({ ...order.value, cartId: cartId.value });
  } catch {
    if (requestVersion === quoteRequestVersion) {
      authoritativeQuote.value = undefined;
      checkoutReview.value = undefined;
    }
    return;
  }
  if (requestVersion !== quoteRequestVersion) return;

  shippingPreferences.value = response;
  authoritativeQuote.value = response?.quote;
  checkoutReview.value = response?.review;
  if (response?.selected) order.value.deliveryMethod = response.selected;
  const tier = response?.quote?.smallOrderTier;
  order.value.smallOrder = tier?._id ? { ...tier, _id: tier._id } : null;
  syncOrderTotals();
};

const updateSubtotal = async (_items: CartProductsInterface[], _checkoutOrder: CheckoutOrderDraft) => {
  await refreshAuthoritativePricing();
  syncOrderTotals();
};

// Watches and Reactions
watch(
  cartItems,
  async () => {
    await refreshAuthoritativePricing();
    syncOrderTotals();
    applyMockCheckoutDefaults();
  },
  { deep: true },
);

watch([cartId, token, userId], () => refreshAuthoritativePricing());
watch(
  () => order.value.deliveryMethod?.service.id,
  () => refreshAuthoritativePricing(),
);

watch(
  [shippingPreferences, cards],
  () => {
    syncOrderTotals();
    applyMockCheckoutDefaults();
  },
  { deep: true },
);

watch(
  () => order.value.type,
  () => {
    syncOrderTotals();
    applyMockCheckoutDefaults();
  },
);

const syncAuthenticatedCheckoutProfile = () => {
  clearGuestCheckout();
  order.value.shippingDetails.address = getShipping();
  order.value.shippingDetails.billingAddress = getBilling();
  order.value.guestContact = null;
};

watch([isGuestCheckout, userId], ([isGuest]) => {
  if (!isGuest) {
    syncAuthenticatedCheckoutProfile();
    return;
  }

  if (!guestCheckoutMode.value) {
    order.value.shippingDetails.address = null;
    order.value.shippingDetails.billingAddress = null;
    order.value.guestContact = null;
  }
});

watch(guestCheckoutMode, (enabled) => {
  if (!isGuestCheckout.value || !enabled) {
    return;
  }

  order.value.shippingDetails.address = createEmptyGuestAddress('Shipping');
  order.value.shippingDetails.billingAddress = createEmptyGuestAddress('Billing');
  order.value.guestContact = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  };
  applyMockCheckoutDefaults();
});

watch(order, persistCheckoutDraft, { deep: true });

// Initialization
onMounted(async () => {
  const config = useRuntimeConfig();
  // Guest demo checkout needs the same public shipping options as signed-in buyers.
  if (Boolean(config.public.MOCK_MODE) && !generalSettings.value) {
    const settings = await fetchSettings();
    if (settings.status === 'success') authStore.addGeneralSettings(settings.data);
  }
  restoreCheckoutDraft();
  if (!isGuestCheckout.value) {
    syncAuthenticatedCheckoutProfile();
  }
  if (isGuestCheckoutMode.value) {
    order.value.shippingDetails.address ??= createEmptyGuestAddress('Shipping');
    order.value.shippingDetails.billingAddress ??= createEmptyGuestAddress('Billing');
    order.value.guestContact ??= { firstName: '', lastName: '', email: '', phone: '' };
  }

  await refreshCartRead();

  await Promise.all([
    fetchCards(), // Fetch user's payment cards
    getCustomerCredit(), // Fetch customer credit information
    refreshAuthoritativePricing(),
  ]);

  restoreSavedCardSelection();
  syncOrderTotals();
  applyMockCheckoutDefaults();
  loading.value = false;
});
</script>
