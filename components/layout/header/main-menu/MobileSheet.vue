<script setup lang="ts">
import { XIcon, MenuIcon, ChevronRight, ChevronLeftIcon, Building2Icon, HeadsetIcon, GemIcon } from 'lucide-vue-next';
import { useCategoriesNavigation } from '@/composables/useCategoriesNavigation';
import CardPlaceholderSmall from '@/assets/icons/card-placeholder-small.svg';

defineProps<{ isScrolled: boolean }>();

const { categories, selectedCategories, currentCategory, onCategoryClick } = useCategoriesNavigation();

const showDiscountSection = ref(false);
const isMobileViewport = ref(false);
const sheetOpen = ref(false);
const primaryNavItems = [
  {
    label: 'News',
    to: '/',
  },
  {
    label: 'How to Buy',
    to: '/',
  },
  {
    label: 'About',
    to: '/',
  },
  {
    label: 'Contact',
    to: '/',
  },
];

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

onMounted(() => {
  updateViewportState();
  window.addEventListener('resize', updateViewportState);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportState);
  }
});
</script>

<template>
  <UiSheet v-model:open="sheetOpen">
    <UiSheetTrigger as-child>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center rounded-md pl-0 pr-4 mr-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 md:mr-0"
        aria-controls="mobile-products-navigation"
        :aria-expanded="sheetOpen"
        aria-label="Open products navigation"
      >
        <MenuIcon class="w-6 h-6" />
        <span v-if="!isScrolled" class="hidden leading-normal font-medium ml-2 md:inline-block lg:ml-4"> Products </span>
      </button>
    </UiSheetTrigger>
    <UiSheetContent
      id="mobile-products-navigation"
      class="w-[min(22rem,calc(100vw-2rem))] h-auto font-Poppins"
      :class="['px-0 pt-0 bottom-0', isScrolled ? 'top-[112px] md:top-[98px]' : 'top-[112px] md:top-[188px]']"
      side="left"
      hidde-close-button
      :overlay-class-name="isScrolled ? 'top-[112px] md:top-[98px]' : 'top-[112px] md:top-[188px]'"
    >
      <UiSheetHeader class="bg-grey-100 border-b border-grey-300">
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
              class="w-9 h-9 flex-shrink-0 text-slate-500"
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
                class="text-left pl-0 flex-col items-start font-normal text-neutral-700"
                :disabled="sub.productCount === 0"
              >
                {{ sub.name }}
                <span class="text-xs font-light text-slate-500">{{ sub.productCount }} products</span>
              </UiButton>
              <UiBadge v-if="false" class="bg-blue-500 text-xs px-2"> New </UiBadge>
              <UiBadge v-if="false" class="bg-rose-600 text-xs px-2"> Sale </UiBadge>
            </div>
            <ChevronRight v-if="sub.productCount !== 0 && (sub.subcategory?.length ?? 0) > 0" class="w-4 h-4 text-neutral-700" />
          </section>
        </div>
      </div>
      <div v-if="showDiscountSection" class="flex flex-col gap-4 h-full md:max-w-screen-sm">
        <div>
          <UiButton class="font-medium p-0 justify-between w-full gap-2 h-11" size="xs" variant="link" @click="showDiscountSection = false">
            <ChevronLeftIcon class="w-4 h-4 text-black ml-2" />
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
        <nav class="grid w-full grid-cols-2 gap-2 pb-3 mb-2 border-b border-grey-300" aria-label="Primary navigation">
          <NuxtLink
            v-for="navItem in primaryNavItems"
            :key="navItem.label"
            :to="navItem.to"
            class="rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-grey-100 hover:text-blue-600"
            @click="closeMobileMenu"
          >
            {{ navItem.label }}
          </NuxtLink>
        </nav>
        <UiButton
          v-for="category in categories"
          :key="category.id"
          class="text-start h-11 w-full flex flex-row flex-nowrap justify-between gap-2 px-0"
          variant="link"
          @click="onMobileCategoryClick(category, true)"
        >
          <div class="flex gap-2 items-center">
            <component :is="category.icon" v-if="category.icon && category.icon !== 'N/A'" class="min-w-5 min-h-5 text-black" />
            <CardPlaceholderSmall v-else class="min-w-6 min-h-6 text-black" />
            <p class="flex flex-col items-start w-full font-medium">
              {{ category.name }}
              <span class="text-xs font-normal text-slate-500"> {{ category.productCount }} products </span>
            </p>
          </div>
          <ChevronRight class="w-4 h-4 text-black" />
        </UiButton>
        <UiButton class="font-medium p-0 justify-between w-full gap-2 h-11" size="xs" variant="link" @click="showDiscountSection = true">
          <GemIcon class="min-w-6 h-6 text-black" />
          <span class="w-full text-start">View our discounted offers</span>
          <ChevronRight class="w-5 h-5 text-black" />
        </UiButton>
      </div>
      <section class="sticky bottom-0 flex justify-end items-center h-10 border-t z-10 bg-white">
        <UiButton size="xs" class="text-xs gap-2 px-1" variant="link">
          <Building2Icon class="w-4 h-4 text-black" />
          Contact Sales
        </UiButton>
        <UiSeparator orientation="vertical" class="mx-1 bg-gray-200 h-4" />
        <UiButton size="xs" class="text-xs gap-2 px-1" variant="link">
          <HeadsetIcon class="w-4 h-4 text-black" />
          Support
        </UiButton>
      </section>
    </UiSheetContent>
  </UiSheet>
</template>
