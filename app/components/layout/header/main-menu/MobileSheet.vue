<script setup lang="ts">
import { useUiStore } from '~/store/uiStore';
import { XIcon, MenuIcon, ChevronRight, ChevronLeftIcon, Building2Icon, HeadsetIcon, GemIcon, UserIcon } from '@lucide/vue';
import { useCategoriesNavigation } from '@/composables/useCategoriesNavigation';
import CardPlaceholderSmall from '@/assets/icons/card-placeholder-small.svg';

const { categories, selectedCategories, currentCategory, onCategoryClick } = useCategoriesNavigation();
const { getCategories } = useCategories();

const formatProductCount = (count?: number) => `${count ?? 0} product${count === 1 ? '' : 's'}`;

const showDiscountSection = ref(false);
const isMobileViewport = ref(false);
const sheetOpen = ref(false);

const getMobileMainRow = () => document.querySelector<HTMLElement>('header [data-mobile-main-row]');

const syncMobileSheetTop = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const header = document.querySelector('header');
  const mainRow = getMobileMainRow();
  const anchor = mainRow ?? header;
  if (!anchor) {
    return;
  }

  const bottom = Math.round(anchor.getBoundingClientRect().bottom);
  document.documentElement.style.setProperty('--mobile-nav-sheet-top', `${bottom}px`);
  document.documentElement.style.setProperty('--mobile-header-height', `${bottom}px`);
};

const mobileSheetTopClass = 'max-md:!top-[var(--mobile-nav-sheet-top,100px)] max-md:!bottom-0 max-md:!h-auto';
const mobileSheetOverlayClass =
  'max-md:!top-[var(--mobile-nav-sheet-top,100px)] max-md:!bg-[rgba(15,23,42,0.45)] max-md:!backdrop-blur-none';
const updateViewportState = () => {
  isMobileViewport.value = window.innerWidth < 1024;
  if (!isMobileViewport.value) {
    sheetOpen.value = false;
    selectedCategories.value = [];
  }
};

const closeMobileMenu = () => {
  showDiscountSection.value = false;
  selectedCategories.value = [];
  sheetOpen.value = false;
};

const onMobileCategoryClick = (category: (typeof categories.value)[number], makeReset: boolean) => {
  onCategoryClick(category, makeReset);

  if ((category.subcategory ?? []).length === 0) {
    closeMobileMenu();
  }
};

const openAccountFromDrawer = () => {
  closeMobileMenu();
  useUiStore().requestOpenAccountModal();
};

let headerResizeObserver: ResizeObserver | undefined;

onMounted(() => {
  updateViewportState();
  syncMobileSheetTop();
  window.addEventListener('resize', updateViewportState);
  window.addEventListener('resize', syncMobileSheetTop);

  const header = document.querySelector('header');
  if (header && typeof ResizeObserver !== 'undefined') {
    headerResizeObserver = new ResizeObserver(syncMobileSheetTop);
    headerResizeObserver.observe(header);
  }

  void getCategories();
});

watch(sheetOpen, (open) => {
  if (open) {
    nextTick(syncMobileSheetTop);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportState);
    window.removeEventListener('resize', syncMobileSheetTop);
    headerResizeObserver?.disconnect();
  }
});
</script>

<template>
  <UiSheet v-model:open="sheetOpen">
    <UiSheetTrigger as-child>
      <UiButton
        type="button"
        variant="ghost"
        size="icon"
        class="h-11 w-11 shrink-0 text-header-foreground hover:bg-card/10"
        aria-controls="mobile-products-navigation"
        :aria-expanded="sheetOpen"
        :aria-label="sheetOpen ? 'Close products navigation' : 'Open products navigation'"
      >
        <MenuIcon class="w-6 h-6" />
      </UiButton>
    </UiSheetTrigger>
    <UiSheetContent
      id="mobile-products-navigation"
      class="w-[min(22rem,calc(100vw-2rem))] font-Poppins max-md:!max-h-[calc(100dvh-var(--mobile-nav-sheet-top,100px))]"
      :class="['px-0 pt-0', mobileSheetTopClass, 'md:top-[var(--mobile-nav-sheet-top,110px)]']"
      side="left"
      hidde-close-button
      :overlay-class-name="`${mobileSheetOverlayClass} md:top-[var(--mobile-nav-sheet-top,110px)]`"
    >
      <UiSheetHeader class="bg-muted border-b border-border">
        <UiSheetTitle class="px-4 py-2">
          <div class="flex items-center justify-between gap-3">
            <UiButton
              v-if="currentCategory"
              variant="link"
              class="flex items-center min-w-0 pl-0 md:mr-0"
              @click="selectedCategories.pop()"
            >
              <ChevronLeftIcon class="w-4 h-4 flex-shrink-0" />
              <span class="leading-normal font-medium ml-2 lg:ml-4 truncate">
                {{ currentCategory.name }}
              </span>
            </UiButton>
            <span v-else class="leading-normal font-medium">Products</span>
            <UiButton
              variant="ghost"
              size="icon"
              class="w-9 h-9 flex-shrink-0 items-center justify-center leading-none text-muted-foreground"
              aria-label="Close products navigation"
              @click="closeMobileMenu"
            >
              <XIcon class="w-5 h-5" />
            </UiButton>
          </div>
          <!-- <UiSeparator class="my-1" /> -->
        </UiSheetTitle>
      </UiSheetHeader>
      <div v-if="currentCategory" class="flex flex-col gap-4 pt-2 overflow-auto max-h-screen pb-32 h-full container">
        <div v-for="sub in currentCategory.subcategory" :key="sub.id" class="flex flex-col gap-4 md:max-w-screen-sm">
          <section class="flex items-center gap-3 justify-between pr-1" @click="onMobileCategoryClick(sub, false)">
            <div class="flex items-center gap-4">
              <UiButton
                variant="link"
                class="text-left pl-0 flex-col items-start font-normal text-foreground"
                :disabled="sub.productCount === 0"
              >
                {{ sub.name }}
                <span class="text-xs font-light text-muted-foreground">{{ formatProductCount(sub.productCount) }}</span>
              </UiButton>
              <UiBadge v-if="false" class="bg-primary text-xs px-2"> New </UiBadge>
              <UiBadge v-if="false" class="bg-rose-600 text-xs px-2"> Sale </UiBadge>
            </div>
            <ChevronRight v-if="sub.productCount !== 0 && (sub.subcategory?.length ?? 0) > 0" class="w-4 h-4 text-foreground" />
          </section>
        </div>
      </div>
      <div v-if="showDiscountSection" class="flex flex-col gap-4 h-full md:max-w-screen-sm">
        <div>
          <UiButton class="font-medium p-0 justify-between w-full gap-2 h-11" size="xs" variant="link" @click="showDiscountSection = false">
            <ChevronLeftIcon class="w-4 h-4 text-foreground ml-2" />
            <span class="w-full text-start">View our discounted offers</span>
          </UiButton>
          <UiSeparator class="my-1" />
        </div>
        <section class="flex flex-col gap-4 px-2 h-full md:max-w-screen-sm">
          <UiSkeleton class="w-full h-14" />
          <UiSkeleton class="w-full h-14" />
          <UiSkeleton class="w-full h-14" />
          <UiSkeleton class="w-full h-14" />
        </section>
      </div>
      <!-- Left Column: Main Categories -->
      <div v-else class="w-full h-full flex flex-col items-start container mt-2">
        <div class="grid w-full grid-cols-1 gap-2 pb-3 mb-2 border-b border-border md:hidden" aria-label="Account shortcuts">
          <UiButton
            variant="link"
            class="h-10 justify-start gap-2 px-2 text-sm font-medium text-muted-foreground"
            @click="openAccountFromDrawer"
          >
            <UserIcon class="w-4 h-4" />
            My Account
          </UiButton>
        </div>
        <UiButton
          v-for="category in categories"
          :key="category.id"
          class="text-start h-11 w-full flex flex-row flex-nowrap justify-between gap-2 px-0"
          variant="link"
          @click="onMobileCategoryClick(category, true)"
        >
          <div class="flex gap-2 items-center">
            <component :is="category.icon" v-if="category.icon && category.icon !== 'N/A'" class="min-w-5 min-h-5 text-foreground" />
            <CardPlaceholderSmall v-else class="min-w-6 min-h-6 text-foreground" />
            <p class="flex flex-col items-start w-full font-medium">
              {{ category.name }}
              <span class="text-xs font-normal text-muted-foreground">{{ formatProductCount(category.productCount) }}</span>
            </p>
          </div>
          <ChevronRight class="w-4 h-4 text-foreground" />
        </UiButton>
        <UiButton class="font-medium p-0 justify-between w-full gap-2 h-11" size="xs" variant="link" @click="showDiscountSection = true">
          <GemIcon class="min-w-6 h-6 text-foreground" />
          <span class="w-full text-start">View our discounted offers</span>
          <ChevronRight class="w-5 h-5 text-foreground" />
        </UiButton>
      </div>
      <section class="sticky bottom-0 flex justify-end items-center h-10 border-t z-10 bg-card">
        <UiButton size="xs" class="text-xs gap-2 px-1" variant="link">
          <Building2Icon class="w-4 h-4 text-foreground" />
          Contact Sales
        </UiButton>
        <UiSeparator orientation="vertical" class="mx-1 bg-gray-200 h-4" />
        <UiButton size="xs" class="text-xs gap-2 px-1" variant="link">
          <HeadsetIcon class="w-4 h-4 text-foreground" />
          Support
        </UiButton>
      </section>
    </UiSheetContent>
  </UiSheet>
</template>
