<template>
  <div data-mobile-main-row class="bg-primary py-3 max-md:py-3.5 md:border-b md:border-black/10 md:py-[14px]">
    <div class="container">
      <div class="relative">
        <div class="flex items-center justify-between gap-4 lg:gap-[35px] xl:gap-[78px]">
          <div class="flex items-center">
            <div class="flex items-center md:mr-4 lg:mr-6">
              <LayoutHeaderMainMenuItems />
              <NuxtLink to="/" class="ml-0 flex items-center md:ml-4 lg:ml-6">
                <Logo class="h-5 w-[85px] grayscale brightness-0 invert md:hidden" />
                <Logo class="hidden w-[82px] grayscale brightness-0 invert md:flex lg:w-[102px]" />
              </NuxtLink>
            </div>
          </div>
          <LayoutHeaderSearch
            :show-results="true"
            :is-visible="showMobileSearch"
            class="flex-1 max-md:hidden xl:block"
            :class="[showMobileSearch ? 'lg:block' : 'md:hidden']"
            @blur="showMobileSearch = false"
          />
          <div class="flex items-center gap-3 md:ml-4 md:gap-6 lg:gap-9">
            <button
              class="flex min-h-11 min-w-11 items-center justify-center xl:hidden"
              :class="[showMobileSearch ? 'md:hidden lg:hidden' : 'md:flex lg:flex']"
              aria-label="Search products"
              @click="showMobileSearch = true"
            >
              <SearchIcon class="h-6 w-6 text-primary-foreground xl:mr-2" />
              <span class="hidden font-medium leading-normal text-primary-foreground xl:inline-block"> Search </span>
            </button>
            <div class="relative hidden items-center max-md:hidden" :class="[showMobileSearch ? 'md:hidden lg:hidden' : 'md:flex']">
              <ClientOnly>
                <LazyNotifications
                  :notifications="notifications"
                  :unread-notifications="unreadNotifications"
                  @delete="deleteNotification"
                  @mark-as-read="markNotificationAsRead"
                />
              </ClientOnly>
            </div>
            <button
              type="button"
              class="hidden min-h-11 min-w-11 flex-col items-center justify-center max-md:hidden"
              :class="[showMobileSearch ? 'md:hidden lg:flex' : 'md:flex']"
              aria-label="Open my account"
              @click="openAccountModal()"
            >
              <UserIcon class="h-6 w-6 text-primary-foreground xl:mb-1" />
              <span class="hidden text-xs font-medium leading-[1.33] text-primary-foreground xl:inline-block"> My Account </span>
            </button>
            <button
              class="relative flex min-h-11 min-w-11 items-center gap-2 text-left"
              :class="[showMobileSearch ? 'max-md:hidden md:flex' : 'flex']"
              aria-label="Open shopping cart"
              @click="openCartModal()"
            >
              <!-- Fixed slot includes badge overhang so the total never collides with the count. -->
              <div class="relative flex h-6 w-9 shrink-0 items-center">
                <CartIcon class="h-6 w-6 text-primary-foreground" :class="isCartPulsing ? 'cart-icon-bump' : ''" />
                <span
                  class="pointer-events-none absolute left-3.5 -top-1.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-[100px] bg-rose-500 px-1 font-Inter text-xs font-medium leading-[1.5] text-white tabular-nums transition-opacity duration-150"
                  :class="[showCartBadge ? 'opacity-100' : 'opacity-0', isCartPulsing ? 'cart-badge-pop' : '']"
                  :aria-hidden="!showCartBadge"
                >
                  {{ cartItems }}
                </span>
              </div>
              <div
                class="hidden min-w-[6.5rem] shrink-0 flex-col justify-center text-primary-foreground tabular-nums md:flex"
                :class="showCartTotal ? 'visible' : 'invisible'"
                :aria-hidden="!showCartTotal"
              >
                <div class="text-sm font-medium leading-5">{{ formattedCartTotal }}</div>
                <div class="text-[10px] leading-4">(ex VAT)</div>
              </div>
            </button>
          </div>
        </div>
        <Transition name="fade">
          <div v-if="showMobileSearch && isMobile" class="absolute z-50 top-1/2 left-0 w-full -translate-y-1/2 md:hidden">
            <div class="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3">
              <label class="relative z-10 flex h-10 min-w-0 flex-1 items-center">
                <form action="" class="flex h-full min-w-0 flex-1 items-center" @submit.prevent="showMobileSearch = false">
                  <input
                    ref="searchDOM"
                    v-model="searchVal"
                    type="search"
                    placeholder="Search products"
                    class="h-full w-full min-w-0 bg-transparent py-2 text-sm leading-[1.71] placeholder:text-gray-500 focus:outline-none"
                    @input="onInput"
                    @keypress.enter="
                      $router.push('/search');
                      searchVal = '';
                    "
                    @blur="showMobileSearch = false"
                  >
                </form>
              </label>
              <button
                type="button"
                class="flex flex-shrink-0 items-center justify-center text-slate-500"
                aria-label="Close search"
                @mousedown.prevent
                @click="showMobileSearch = false"
              >
                <XIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
        </Transition>
        <Transition name="fade">
          <LayoutHeaderSearchResults v-if="searchVal" :products="productList" :keyword="searchVal" :is-loading="isLoading" />
        </Transition>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="slide-from-left">
      <LayoutHeaderMainMenu v-if="showNavModal" />
    </Transition>
    <LayoutAccountModal v-if="showAccountModal" @close="closeAccountModal" />
    <CartModal v-if="cartModal.show" @close="cartModal.show = false" />
  </Teleport>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance';
import { storeToRefs } from 'pinia';
import Logo from '@/assets/media/logo.svg';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LogoSM from '@/assets/media/logo-sm.svg';
import SearchIcon from '@/assets/icons/search.svg';
import UserIcon from '@/assets/icons/user.svg';
import CartIcon from '@/assets/icons/cart.svg';
import XIcon from '@/assets/icons/x.svg';
import CartModal from '@/components/layout/favorites-cart-modal/Index.vue';
import { showNavModal } from '~~/config/modal/nav';
import type { Notification } from '~/types/dashboard/notification';
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import type { ProductSearchResponse } from '~/model/products/response/ProductSearchResponse';
import type { CartInterface } from '~/types/cart';
import {
  deleteNotificationById,
  fetchGetNotifications,
  markNotificationAsRead as fetchMarkNotificationAsRead,
} from '~/composables/api/notifications';
import { fetchSearchProduct } from '~/composables/api/products';
import { useCartStore } from '~/store/cartStore';
import { useAuthStore } from '~/store/authStore';
import { useNotificationStore } from '~/store/notificationStore';
import { useUiStore } from '~/store/uiStore';
import { useClientReady } from '~/composables/useClientReady';
import { useCartBadgeMotion } from '~/composables/useCartBadgeMotion';

const cartStore = useCartStore();
const uiStore = useUiStore();
const isClientReady = useClientReady();
const { isPulsing: isCartPulsing, syncFromCart, resetBaseline } = useCartBadgeMotion();
const showCartBadge = computed(() => isClientReady.value && cartItems.value > 0);
const showCartTotal = computed(() => isClientReady.value && totalCartPrice.value > 0);
const formattedCartTotal = computed(() => `${Number(totalCartPrice.value || 0).toFixed(2)} Lei`);
const { getCart, getCartSubtotal } = storeToRefs(cartStore);

const notificationStore = useNotificationStore();
const { unreadNotifications } = storeToRefs(notificationStore);

const authStore = useAuthStore();
const hasToken = computed(() => Boolean(authStore.getToken()));

const totalCartPrice = ref(0);

const subtotal = () => {
  totalCartPrice.value = getCartSubtotal.value;
};

const route = useRoute();
const router = useRouter();

const isMobile = ref(false);
const signinQuery = computed(() => route.query.signin);
const showAccountModal = ref(false);
const cartModal = ref({
  show: false,
});

const cartItems = ref(0);
const cart = ref<CartInterface | null>(null);
const category = ref<string | null>(route.query?.category?.toString() || null);

const closeAccountModal = async () => {
  showAccountModal.value = false;

  // Only clear the sign-in flag when the user dismisses the modal.
  // Keep `redirect` so a successful login (or re-open) can still honor it.
  // Do not router.replace after login — Form.vue navigates; racing replace drops redirect.
  if (route.query.signin) {
    const rest = { ...route.query };
    delete rest.signin;
    await router.replace({ query: rest });
  }
};

const openAccountModal = () => {
  cartModal.value.show = false;
  showAccountModal.value = true;
};

const openCartModal = () => {
  showAccountModal.value = false;
  cartModal.value.show = true;
};

const searchVal = ref('');
const showMobileSearch = ref(false);
const searchDOM = ref<HTMLInputElement>();
const productList = ref<ProductInterface[]>([]);
const isLoading = ref(false);

const syncHeaderCartFromStore = (data: CartInterface | null) => {
  if (data?.products) {
    cartItems.value = data.products.length;
    cart.value = data;
    syncFromCart(data);
    subtotal();
    return;
  }

  cartItems.value = 0;
  totalCartPrice.value = 0;
  cart.value = null;
  resetBaseline();
};

watch(
  () => cartStore.cart,
  (data) => {
    syncHeaderCartFromStore(data);
  },
  { deep: true, immediate: true }
);

watch(
  () => uiStore.accountModalRequestId,
  () => {
    openAccountModal();
  }
);

watch(
  () => notificationStore.refreshRequestId,
  () => {
    void fetchNofications();
  }
);

const fetchList = async () => {
  const data = getCart.value as CartInterface | null;

  if (!data?.products?.length) {
    return;
  }

  cartItems.value = data.products.length;
  cart.value = data;
  syncFromCart(data, { animate: false });
};

const searchProduct = async (keyword: string, page = 1, perPage = 10): Promise<ProductInterface[]> => {
  isLoading.value = true;

  const response = (await fetchSearchProduct(keyword, category.value, page, perPage)) as ProductSearchResponse;
  const products = response.data;

  if (!products?.items?.items) {
    isLoading.value = false;
    return [];
  }

  Emitter.emit('product-keyword-change', { keyword, products });

  isLoading.value = false;
  return products.items.items as unknown as ProductInterface[];
};

const onInput = _debounce(async () => {
  productList.value = await searchProduct(searchVal.value);
  isLoading.value = false;
}, 200);

const error = ref(false);

const notifications = ref<Notification[]>([] as Notification[]);

const fetchNofications = async () => {
  error.value = false;
  isLoading.value = true;
  unreadNotifications.value = 0;
  notifications.value = [];

  if (!hasToken.value) {
    isLoading.value = false;
    return;
  }

  const response = await fetchGetNotifications();
  if (response.status !== 'success') {
    isLoading.value = false;
    error.value = true;

    return;
  } else {
    isLoading.value = false;
  }

  notifications.value = response.description;
  response.description.forEach((notification) => {
    if (notification.seen === false) {
      unreadNotifications.value++;
    }
  });
};

const markNotificationAsRead = async (notification: Notification, index: number) => {
  if (notifications.value[index].seen !== true) {
    unreadNotifications.value--;
  }
  const response = await fetchMarkNotificationAsRead(notification.id);
  if (response.status !== 'success') {
    return;
  }
  notifications.value[index].seen = true;
};
const deleteNotification = async (notification: Notification, index: number) => {
  const response = await deleteNotificationById(notification.id);
  if (response.status !== 'success') {
    return;
  }
  notifications.value.splice(index, 1);
};

watch(showMobileSearch, (newVal) => {
  if (newVal) {
    nextTick(() => {
      searchDOM.value?.focus();
    });
  } else {
    searchVal.value = '';
  }
});

watch(
  signinQuery,
  (newVal) => {
    if (newVal === 'true') {
      showAccountModal.value = true;
    }
  },
  { immediate: true }
);

onMounted(() => {
  isMobile.value = window.innerWidth <= 1024;
  subtotal();
  Promise.all([fetchNofications(), fetchList()]);
});

watch(
  () => authStore.getToken(),
  async (newVal) => {
    if (newVal) {
      // Close the modal without clearing query via router.replace — login already navigates.
      showAccountModal.value = false;
      await fetchNofications();
      await fetchList();
    } else {
      notifications.value = [];
      unreadNotifications.value = 0;
    }
  },
  { deep: true }
);
</script>
