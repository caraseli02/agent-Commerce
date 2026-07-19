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
            @click="openFavoritesCartModal('shopping-cart')"
          >
            <div class="relative flex-shrink-0" :class="showCartBadge ? 'mr-2' : 'mr-4'">
              <CartIcon class="w-6 h-6 text-slate-500" />
              <span
                v-if="showCartBadge"
                class="absolute -top-1.5 -right-2 flex items-center justify-center h-[18px] font-Inter z-10 bg-rose-500 text-white rounded-[100px] text-xs font-medium leading-[1.5]"
                :class="[cartItems < 10 ? 'w-[18px]' : cartItems < 100 ? 'w-6' : 'w-[31px]']"
              >
                <span>{{ cartItems }}</span>
              </span>
            </div>
            <div v-if="showCartTotal" class="flex-col text-slate-500 flex-shrink-0">
              <div class="leading-[1.25] font-medium mb-0.5">{{ totalCartPrice }} Lei</div>
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
      :class="[showAccountModal || favoritesCartModal.show ? 'backdrop-blur-[7.5px]' : 'backdrop-blur-none opacity-0 pointer-events-none']"
      @click="
        showAccountModal = false;
        favoritesCartModal.show = false;
      "
    />
    <Transition name="slide-from-right">
      <CartModal v-if="favoritesCartModal.show" :tab="favoritesCartModal.tab" :data="items" @close="favoritesCartModal.show = false" />
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

const cartStore = useCartStore();
const isClientReady = useClientReady();
const showCartBadge = computed(() => isClientReady.value && cartItems.value > 0);
const showCartTotal = computed(() => isClientReady.value && totalCartPrice.value > 0);

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
  }
});

const showAccountModal = ref(false);

const favoritesCartModal = ref({
  show: false,
  tab: 'favorites' as 'favorites' | 'shopping-cart',
});

const openFavoritesCartModal = (tab: 'favorites' | 'shopping-cart') => {
  showAccountModal.value = false;
  favoritesCartModal.value = {
    show: true,
    tab,
  };
};

const fetchList = async () => {
  const data = getCart.value as CartInterface | null;

  if (!data || !data.products?.length) {
    return;
  }

  items.value = data;
  cartItems.value = data.products.length;
};

const subtotal = () => {
  totalCartPrice.value = getCartSubtotal.value;
};

onMounted(() => {
  subtotal();
  void fetchList();
});
</script>
