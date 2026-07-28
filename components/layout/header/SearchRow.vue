<template>
  <div class="hidden relative z-20 bg-white py-3 md:py-4 xl:py-3" :class="[isScrolled ? '' : 'md:block']">
    <div class="container">
      <div class="relative flex items-center justify-between gap-6 md:gap-[25px] lg:gap-[52px] xl:gap-[162px]">
        <NuxtLink to="/" class="flex flex-shrink-0">
          <Logo class="w-[142px] xl:w-[141px]" />
        </NuxtLink>
        <LayoutHeaderSearch :show-results="!isScrolled" class="flex-1 xl:max-w-[680px]" />
        <div class="flex items-center xl:gap-[46px]">
          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center text-left max-md:hidden"
            aria-label="Open shopping cart"
            @click="openCartModal()"
          >
            <div class="relative mr-3 flex h-6 w-10 shrink-0 items-center">
              <CartIcon class="h-6 w-6 text-slate-500" :class="isCartPulsing ? 'cart-icon-bump' : ''" />
              <span
                class="pointer-events-none absolute left-3.5 -top-1.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-[100px] bg-rose-500 px-1 font-Inter text-xs font-medium leading-[1.5] text-white tabular-nums transition-opacity duration-150"
                :class="[showCartBadge ? 'opacity-100' : 'opacity-0', isCartPulsing ? 'cart-badge-pop' : '']"
                :aria-hidden="!showCartBadge"
              >
                {{ cartItems }}
              </span>
            </div>
            <div
              class="flex min-w-[6.5rem] shrink-0 flex-col text-slate-500 tabular-nums"
              :class="showCartTotal ? 'visible' : 'invisible'"
              :aria-hidden="!showCartTotal"
            >
              <div class="mb-0.5 leading-[1.25] font-medium">{{ formattedCartTotal }}</div>
              <div class="text-[10px] leading-[1.6]">(ex VAT)</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="slide-from-right">
      <LayoutAccountModal v-if="showAccountModal" @close="showAccountModal = false" />
    </Transition>
    <div
      class="hidden fixed z-[60] top-0 left-0 w-full h-full bg-[rgba(47,50,65,0.10)] cursor-pointer transition-all duration-300 md:block"
      :class="[showAccountModal || cartModal.show ? 'backdrop-blur-[7.5px]' : 'backdrop-blur-none opacity-0 pointer-events-none']"
      @click="
        showAccountModal = false;
        cartModal.show = false;
      "
    />
    <Transition name="slide-from-right">
      <CartModal v-if="cartModal.show" :data="items" @close="cartModal.show = false" />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import { storeToRefs } from 'pinia';
import Logo from '@/assets/media/logo.svg';
import CartIcon from '@/assets/icons/cart.svg';
import CartModal from '@/components/layout/favorites-cart-modal/Index.vue';
import type { CartInterface } from '~/types/cart';
import { useCartStore } from '~/store/cartStore';
import { useClientReady } from '~/composables/useClientReady';
import { useCartBadgeMotion } from '~/composables/useCartBadgeMotion';

const cartStore = useCartStore();
const isClientReady = useClientReady();
const { isPulsing: isCartPulsing, syncFromCart, resetBaseline } = useCartBadgeMotion();
const showCartBadge = computed(() => isClientReady.value && cartItems.value > 0);
const showCartTotal = computed(() => isClientReady.value && totalCartPrice.value > 0);
const formattedCartTotal = computed(() => `${Number(totalCartPrice.value || 0).toFixed(2)} Lei`);

const { getCart, getCartSubtotal } = storeToRefs(cartStore);
const totalCartPrice = ref(0);

const cartItems = ref(0);
const items = ref<CartInterface>({} as CartInterface);

defineProps({
  isScrolled: {
    type: Boolean,
    required: true,
  },
});

Emitter.on('update-cart', async (data: CartInterface) => {
  if (data && data.products) {
    items.value = data;
    cartItems.value = items.value.products.length;
    syncFromCart(data);
    subtotal();
  }
});

Emitter.on('notifications', async (notifications: boolean) => {
  if (notifications) {
    // noop
  }
});

Emitter.on('remove-cart-and-notifications', async (isSignout: boolean) => {
  if (isSignout) {
    cartStore.emptyCart();
    cartItems.value = 0;
    items.value = {} as CartInterface;
    totalCartPrice.value = 0;
    resetBaseline();
  }
});

const showAccountModal = ref(false);

const cartModal = ref({
  show: false,
});

const openCartModal = () => {
  showAccountModal.value = false;
  cartModal.value.show = true;
};

const fetchList = async () => {
  const data = getCart.value as CartInterface | null;

  if (!data || !data.products?.length) {
    return;
  }

  items.value = data;
  cartItems.value = data.products.length;
  syncFromCart(data, { animate: false });
};

const subtotal = () => {
  totalCartPrice.value = getCartSubtotal.value;
};

onMounted(() => {
  subtotal();
  void fetchList();
});
</script>
