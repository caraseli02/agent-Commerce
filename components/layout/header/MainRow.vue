<template>
  <div
    data-mobile-main-row
    class="bg-primary border-b border-black/10 py-3 max-md:py-3.5"
    :class="[
      isScrolled
        ? showMobileSearch
          ? 'md:py-2 lg:py-3 xl:py-[14px]'
          : 'md:py-[11px] lg:py-[15px] xl:py-[14px]'
        : 'md:py-[18px] lg:py-[22px] xl:py-[14px]',
    ]"
  >
    <div class="container">
      <div class="relative">
        <div class="flex items-center justify-between gap-4 lg:gap-[35px] xl:gap-[78px]" :class="[isScrolled ? 'md:gap-0' : '']">
          <div class="flex items-center">
            <div class="flex items-center" :class="[isScrolled ? 'md:mr-[29px] lg:mr-0' : 'md:mr-4 lg:mr-6']">
              <LayoutHeaderMainMenuItems :is-scrolled="isScrolled" />
              <NuxtLink to="/" class="flex items-center" :class="[isScrolled ? 'md:ml-4 lg:ml-6 ml-0' : 'md:hidden']">
                <!-- Use full Logo on mobile to avoid truncation, but smaller -->
                <Logo class="w-[85px] h-5 grayscale brightness-0 invert md:hidden" />
                <Logo class="hidden w-[82px] grayscale brightness-0 invert lg:w-[102px] md:flex" :class="[isScrolled ? '' : 'md:hidden']" />
              </NuxtLink>
            </div>
          </div>
          <LayoutHeaderSearch
            v-if="isScrolled"
            :show-results="true"
            :is-visible="showMobileSearch"
            :is-scrolled="isScrolled"
            class="flex-1 max-md:hidden xl:block"
            :class="[showMobileSearch ? 'lg:block' : 'md:hidden']"
            @blur="showMobileSearch = false"
          />
          <div class="flex items-center gap-3 md:gap-9 lg:ml-0 lg:gap-9 xl:gap-9" :class="[isScrolled ? 'md:ml-4' : 'md:gap-6']">
            <button
              class="flex items-center xl:hidden"
              :class="[isScrolled ? (showMobileSearch ? 'md:hidden lg:hidden' : 'md:flex lg:flex') : 'md:hidden']"
              aria-label="Search products"
              @click="showMobileSearch = true"
            >
              <SearchIcon class="w-6 h-6 text-primary-foreground xl:mr-2" />
              <span class="hidden leading-normal font-medium text-primary-foreground xl:inline-block"> Search </span>
            </button>
            <button
              class="hidden flex-col items-center max-md:hidden md:flex"
              :class="[isScrolled ? (showMobileSearch ? 'md:hidden lg:hidden xl:flex' : 'lg:flex xl:flex') : '']"
              @click="openFavoritesCartModal('favorites')"
            >
              <HeartIcon class="w-6 h-6 text-primary-foreground xl:mb-1" />
              <span class="hidden font-medium text-xs leading-[1.33] text-primary-foreground xl:inline-block"> Favorites </span>
            </button>
            <div
              class="relative max-md:hidden"
              :class="[isScrolled ? (showMobileSearch ? 'md:hidden lg:hidden' : 'md:flex') : 'flex items-center']"
            >
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
              class="hidden items-center max-md:hidden md:flex"
              :class="[isScrolled ? (showMobileSearch ? 'md:hidden lg:flex' : 'md:flex') : '']"
              aria-label="Open my account"
              @click="openAccountModal()"
            >
              <UserIcon class="w-6 h-6 text-primary-foreground xl:mb-1" />
              <span class="hidden text-xs leading-[1.33] font-medium text-primary-foreground xl:inline-block"> My Account </span>
            </button>
            <button
              class="relative flex items-center text-left"
              :class="[isScrolled ? '' : 'md:hidden', showMobileSearch ? 'max-md:hidden md:flex' : 'flex']"
              aria-label="Open shopping cart"
              @click="openFavoritesCartModal('shopping-cart')"
            >
              <div class="flex items-center md:-mr-5 xl:-mr-5">
                <CartIcon class="w-6 h-6 text-primary-foreground lg" :class="[cartItems > 0 ? 'mr-0' : 'mr-4']" />
                <span
                  v-if="cartItems > 0"
                  class="flex -translate-y-2 -translate-x-2.5 items-center justify-center h-[18px] font-Inter z-10 -top-1 -right-[9px] bg-rose-500 text-white rounded-[100px] text-xs font-medium leading-[1.5]"
                  :class="[cartItems < 10 ? 'w-[18px]' : cartItems < 100 ? 'w-6' : 'w-[31px]']"
                >
                  <span> {{ cartItems }} </span>
                </span>
              </div>
              <div v-if="totalCartPrice" class="flex-col text-primary-foreground flex-shrink-0 ml-6 max-md:hidden">
                <div class="leading-[1.25] font-medium mb-0.5">{{ totalCartPrice }} Lei</div>
                <div class="text-[10px] leading-[1.6]">(ex VAT)</div>
              </div>
            </button>
          </div>
        </div>
        <Transition name="fade">
          <div v-if="showMobileSearch && isMobile" class="absolute z-50 top-1/2 -translate-y-1/2 left-0 w-full md:hidden">
            <div class="flex items-center border border-border bg-white h-10 rounded-lg px-3">
              <label class="relative z-10 flex-1 flex items-center justify-between h-10">
                <form action="" @submit.prevent="showMobileSearch = false">
                  <input
                    ref="searchDOM"
                    v-model="searchVal"
                    type="search"
                    placeholder="Search products"
                    class="bg-transparent flex-1 w-full py-2 h-10 text-sm leading-[1.71] placeholder:text-gray-500 focus:outline-none"
                    @input="onInput"
                    @keypress.enter="
                      $router.push('/search');
                      searchVal = '';
                    "
                    @blur="showMobileSearch = false"
                  />
                </form>
                <XIcon class="flex-shrink-0 w-5 h-5 text-slate-500" @click="showMobileSearch = false" />
              </label>
            </div>
          </div>
        </Transition>
        <Transition name="fade">
          <LayoutHeaderSearchResults
            v-if="searchVal"
            :products="productList"
            :keyword="searchVal"
            :is-scrolled="isScrolled"
            :is-loading="isLoading"
          />
        </Transition>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="slide-from-left">
      <LayoutHeaderMainMenu v-if="showNavModal" />
    </Transition>
    <Transition name="fade">
      <div
        v-if="showAccountModal || favoritesCartModal.show"
        class="hidden fixed z-[60] top-0 left-0 w-full h-full bg-[rgba(47,50,65,0.10)] transition-opacity duration-300 cursor-pointer md:block"
        :class="[
          showAccountModal || favoritesCartModal.show ? 'backdrop-blur-[7.5px]' : 'backdrop-blur-none opacity-0 pointer-events-none',
        ]"
        @click="
          closeAccountModal();
          favoritesCartModal.show = false;
        "
      />
    </Transition>
    <Transition name="slide-from-right">
      <LayoutAccountModal v-if="showAccountModal" @close="closeAccountModal" />
    </Transition>
    <Transition name="slide-from-right">
      <CartModal v-if="favoritesCartModal.show" :tab="favoritesCartModal.tab" :data="items" @close="favoritesCartModal.show = false" />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance';
import { storeToRefs } from 'pinia';
import Logo from '@/assets/media/logo.svg';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LogoSM from '@/assets/media/logo-sm.svg';
import SearchIcon from '@/assets/icons/search.svg';
import HeartIcon from '@/assets/icons/heart.svg';
import UserIcon from '@/assets/icons/user.svg';
import CartIcon from '@/assets/icons/cart.svg';
import XIcon from '@/assets/icons/x.svg';
import CartModal from '@/components/layout/favorites-cart-modal/Index.vue';
import { showNavModal } from '~~/config/modal/nav';
import type { Notification } from '~/types/dashboard/notification';
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import type { ProductSearchResponse } from '~/model/products/response/ProductSearchResponse';
import type { CartInterface } from '~/model/cart/response/cart.interface';
import {
  deleteNotificationById,
  fetchGetNotifications,
  markNotificationAsRead as fetchMarkNotificationAsRead,
} from '~/composables/api/notifications';
import { fetchSearchProduct } from '~/composables/api/products';
import { useCartStore } from '~/store/cartStore';
import { useAuthStore } from '~/store/authStore';
import { useNotificationStore } from '~/store/notificationStore';

const cartStore = useCartStore();
const { getCart, getCartSubtotal } = storeToRefs(cartStore);

const notificationStore = useNotificationStore();
const { unreadNotifications } = storeToRefs(notificationStore);

const authStore = useAuthStore();
const hasToken = computed(() => Boolean(authStore.getToken()));

const totalCartPrice = ref(0);

const subtotal = () => {
  totalCartPrice.value = getCartSubtotal.value;
};

subtotal();

defineProps({
  isScrolled: {
    type: Boolean,
    required: true,
  },
});

const route = useRoute();
const router = useRouter();

const isMobile = ref(false);
const signinQuery = computed(() => route.query.signin);
const showAccountModal = ref(false);
const favoritesCartModal = ref({
  show: false,
  tab: 'favorites' as 'favorites' | 'shopping-cart',
});

const cartItems = ref(0);
const cart = ref<CartInterface | null>(null);
const category = ref<string | null>(route.query?.category?.toString() || null);

const closeAccountModal = async () => {
  showAccountModal.value = false;

  if (route.query.signin) {
    const rest = { ...route.query };
    delete rest.signin;
    delete rest.redirect;
    await router.replace({ query: rest });
  }
};

const openAccountModal = () => {
  favoritesCartModal.value.show = false;
  showAccountModal.value = true;
};

const openFavoritesCartModal = (tab: 'favorites' | 'shopping-cart') => {
  showAccountModal.value = false;
  favoritesCartModal.value = {
    show: true,
    tab,
  };
};

const searchVal = ref('');
const showMobileSearch = ref(false);
const searchDOM = ref<HTMLInputElement>();
const items = ref<CartInterface>({} as CartInterface);
const productList = ref<ProductInterface[]>([]);
const isLoading = ref(false);

Emitter.on('remove-cart-and-notifications', async (isSignout: boolean) => {
  if (isSignout) {
    cartStore.emptyCart();
    cartItems.value = 0;
    totalCartPrice.value = 0;
    items.value = {} as CartInterface;
  }
});

Emitter.on('update-cart', async (data: CartInterface) => {
  if (data && data.products) {
    items.value = data;
    cartItems.value = items.value.products.length;
    cart.value = items.value;
    subtotal();
  }
});

Emitter.on('open-account-modal', async () => {
  openAccountModal();
});

Emitter.on('open-favorites-cart-modal', (tab: 'favorites' | 'shopping-cart') => {
  openFavoritesCartModal(tab);
});

const fetchList = async () => {
  const data = getCart.value as CartInterface | null;

  if (!data?.products?.length) {
    return;
  }

  items.value = data;
  cartItems.value = data.products.length;
  cart.value = data;
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

watch(signinQuery, (newVal) => {
  if (newVal === 'true') {
    showAccountModal.value = true;
  }
});

onMounted(() => {
  isMobile.value = window.innerWidth <= 1024;
  if (signinQuery.value === 'true') {
    showAccountModal.value = true;
  }
  Promise.all([fetchNofications(), fetchList()]);
});

watch(
  () => authStore.getToken(),
  async (newVal) => {
    if (newVal) {
      await closeAccountModal();
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
