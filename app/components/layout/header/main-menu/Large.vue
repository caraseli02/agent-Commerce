<template>
  <div
    v-click-outside="() => handleClickOutside()"
    class="grid grid-cols-[0px_1fr] rounded-b-md border border-border shadow-sm max-h-[calc(100vh-178px)] md:h-[448px] xl:h-[550px] transition-all duration-150"
    :class="[isBannerExpanded ? '' : 'grid-cols-[0px_1fr] md:grid-cols-[260px_1fr] lg:grid-cols-[260px_1fr] xl:grid-cols-[290px_1fr]']"
  >
    <div
      class="relative z-40 flex flex-col gap-1 p-2.5 bg-card border-r border-gray-200 max-h-[calc(100vh-178px)] overflow-y-auto scrollbar-thin rounded-bl-md w-[260px] transition-opacity duration-200 xl:w-[290px] xl:py-[13px] xl:gap-1"
      :class="[isStatic ? 'hidden h-0 md:h-auto md:flex' : '', isBannerExpanded ? 'md:opacity-0 md:pointer-events-none' : '']"
    >
      <UiButton
        v-for="(category, index) in allCategories"
        :key="index"
        variant="ghost"
        class="group h-auto justify-start px-2 py-1.5 rounded-[5px] w-full text-muted-foreground text-left font-Inter hover:text-primary xl:px-2.5 xl:py-2"
        :class="[selectedCategory === category ? 'text-primary bg-accent' : '']"
        @click="
          selectedCategory = category;
          selectedSubCategory = null;
          handleCategoryClick(category);
        "
      >
        <div class="flex items-center justify-center w-8 h-8 rounded bg-gray-100 mr-2 xl:w-10 xl:h-10 xl:mr-2.5">
          <component :is="category.icon" class="w-[22px] h-[22px]" />
        </div>
        <div>
          <div class="text-sm font-semibold leading-normal mb-px xl:text-base xl:mb-1.5">
            {{ category.name }}
          </div>
          <div
            class="text-xs font-semibold transition-colors duration-300 group-hover:text-muted-foreground"
            :class="[selectedCategory === category ? 'text-muted-foreground ' : 'text-muted-foreground']"
          >
            {{ category.productCount }} items
          </div>
        </div>
      </UiButton>
    </div>
    <div
      class="relative z-20 col-start-2 row-start-1 flex flex-col items-start px-[15px] pt-[15px] text-white h-full max-h-[calc(100vh-178px)] overflow-y-auto scrollbar-thin transition-all duration-500 md:h-[448px] md:pt-5 lg:px-5 xl:px-[30px] xl:pt-[45px] xl:h-[550px]"
      :class="[!selectedCategory && !selectedSubCategory ? '' : 'opacity-0 pointer-events-none']"
    >
      <h3 class="relative z-20 font-semibold mb-[5px] md:text-2xl lg:text-[32px] lg:mb-2.5 xl:text-[40px]">
        Featured procurement workflows
      </h3>
      <p
        class="relative z-20 text-[11px] mb-[15px] max-w-[222px] leading-snug md:text-sm md:mb-[22px] md:max-w-[258px] lg:text-base lg:mb-[30px] lg:max-w-[415px] xl:text-lg xl:max-w-[642px] xl:mb-[46px]"
      >
        Explore sourcing, order management, and account workflows in one polished B2B electronics experience.
      </p>
      <UiButton
        class="relative z-20 h-auto rounded px-[15px] py-2 text-xs mb-[30px] md:px-6 md:py-[11px] md:text-sm md:mb-[60px] lg:mb-[34px] xl:mb-14"
        @click="router.push('/search')"
      >
        View More
      </UiButton>
      <Swiper
        ref="swiperDOM"
        :key="String(isBannerExpanded)"
        :modules="[A11y, Pagination]"
        :slides-per-view="isBannerExpanded ? 4 : 3"
        :space-between="10"
        :grab-cursor="true"
        :pagination="
          {
            bulletElement: 'button',
            clickable: true,
          } as any
        "
        :breakpoints="{
          1024: {
            slidesPerView: isBannerExpanded ? 5 : 4,
            spaceBetween: 13,
          },
          1280: {
            slidesPerView: isBannerExpanded ? 7 : 6,
            spaceBetween: 15,
          },
        }"
        class="headerSubmenu--swiper w-full"
      >
        <SwiperSlide v-for="(item, index) in slides" :key="index">
          <div
            class="flex flex-col items-center justify-center text-center bg-primary/85 border border-primary/40 shadow-sm py-1.5 h-full rounded-md md:py-[15px] lg:pt-[25px] xl:py-[35px]"
          >
            <component
              :is="item.icon"
              class="w-[34px] h-[34px] mb-1 flex-shrink-0 md:w-[50px] md:h-[50px] md:mb-[21px] lg:w-[60px] lg:h-[60px] lg:mb-2.5 xl:mb-[15px]"
            />
            <div class="text-[10px] font-medium leading-[1.4] text-white md:text-xs lg:text-[13px] xl:text-sm">
              {{ item.title }}
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
      <img
        :src="ItemImage"
        alt="Img"
        class="absolute z-20 top-[38px] right-[15px] w-[111px] object-contain md:w-[160px] md:top-[61px] lg:w-[240px] lg:top-[78px] lg:right-5 xl:w-[376px] xl:top-[52px] xl:right-[30px]"
        loading="lazy"
      />
      <img
        :src="SlideBg"
        alt="Background"
        class="absolute z-10 top-0 left-0 w-full h-full object-cover"
        :class="[isBannerExpanded ? 'rounded-b-md' : 'rounded-br-md max-md:rounded-bl-md']"
        loading="lazy"
      />
      <div
        class="absolute z-10 top-0 left-0 w-full h-full bg-slate-900/85 pointer-events-none"
        :class="[isBannerExpanded ? 'rounded-b-md' : 'rounded-br-md max-md:rounded-bl-md']"
      />
      <UiButton
        v-if="isStatic"
        class="hidden absolute z-20 top-[15px] right-0 h-auto px-[3px] py-[5px] bg-primary/70 rounded-none rounded-l overflow-hidden border border-primary/50 transition-all duration-300 hover:px-2 md:flex"
        :class="{ 'sideNav--toggler_active': isBannerExpanded }"
        :aria-label="isBannerExpanded ? 'Collapse banner' : 'Expand banner'"
        :aria-expanded="isBannerExpanded"
        :style="{
          boxShadow: '0px 0px 5px rgba(34, 34, 34, 0.15)',
        }"
        @click="isBannerExpanded = !isBannerExpanded"
        @mouseenter="handleTogglerMouseEnter"
        @mouseleave="handleTogglerMouseLeave"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 18 18"
          class="w-[18px] h-[18px] transition-transform duration-300"
          :class="[isBannerExpanded ? 'rotate-180' : '']"
        >
          <path
            fill="#fff"
            d="M8.549 14.5 3.532 9l5.013-5.464a.946.946 0 0 0 .252-.643c0-.265-.11-.53-.292-.719a1.006 1.006 0 0 0-1.397.076L1.54 8.357a.943.943 0 0 0 0 1.286l5.57 6.107c.363.396.952.43 1.396.075.374-.353.407-.967.044-1.325Zm.833-6.143a.943.943 0 0 0 0 1.286l5.607 6.107c.363.397.989.43 1.396.075.408-.353.442-.967.077-1.325L11.447 9l5.012-5.464a.946.946 0 0 0 .253-.643c0-.265-.11-.53-.293-.719a1.006 1.006 0 0 0-1.396.076L9.382 8.357Z"
          />
        </svg>
      </UiButton>
    </div>
    <div
      class="relative z-30 col-start-2 row-start-1 flex flex-col bg-card font-Inter max-h-[calc(100vh-178px)] overflow-y-auto scrollbar-thin rounded-br-md transition-all duration-500 xl:hidden"
      :class="[selectedCategory ? '' : 'opacity-0 pointer-events-none -translate-x-10']"
    >
      <div class="flex items-center justify-between border-b border-gray-200 px-[15px] py-2.5">
        <UiButton
          variant="ghost"
          size="icon"
          class="h-auto w-auto"
          :aria-label="selectedSubCategory ? `Back to ${selectedCategory?.name}` : 'Back to all categories'"
          @click="selectedSubCategory ? (selectedSubCategory = null) : (selectedCategory = null)"
        >
          <CaretLeft class="w-6 h-6" />
        </UiButton>
        <div class="text-sm font-semibold text-primary">
          {{ selectedSubCategory ? selectedSubCategory.name : selectedCategory?.name }}
        </div>
      </div>
      <div class="flex flex-col flex-1">
        <div class="flex-1 overflow-y-auto scrollbar-thin">
          <div v-if="selectedCategory && !selectedSubCategory" class="flex flex-wrap gap-x-2.5 gap-y-[15px] p-2.5 lg:p-[15px]">
            <UiButton
              v-for="(subCategory, index) in selectedCategory.subcategory"
              :key="index"
              variant="ghost"
              class="group h-auto px-2 py-1.5 rounded-[5px] text-muted-foreground text-left hover:text-primary"
              @click="
                selectedSubCategory = subCategory;
                handleCategoryClick(subCategory);
              "
            >
              <div>
                <div class="text-sm font-semibold">
                  {{ subCategory.name }}
                </div>
                <div class="text-xs font-semibold text-muted-foreground transition-colors duration-300 group-hover:text-muted-foreground">
                  {{ subCategory.productCount }} items
                </div>
              </div>
            </UiButton>
          </div>
          <div
            v-else-if="selectedSubCategory"
            class="grid grid-cols-2 gap-3 px-4 py-2.5 lg:grid-cols-3 lg:gap-x-[25px] lg:px-5 lg:pt-[5px]"
          >
            <NuxtLink
              v-for="(subCategory, index) in selectedSubCategory?.subcategory"
              :key="index"
              :to="`/search?keyword=${encodeURIComponent(subCategory.name)}`"
              class="relative flex items-center text-[#6E6E6E] text-left px-[5px] transition-colors duration-300 hover:text-primary"
            >
              <div class="text-sm font-medium truncate mr-[5px]">{{ subCategory.name }} ({{ subCategory.productCount }} items)</div>
              <div
                v-if="index === 3 || index === 5"
                class="bg-primary text-primary-foreground rounded-full px-[5px] py-px font-Inter font-semibold text-xs leading-tight"
              >
                New
              </div>
            </NuxtLink>
          </div>
        </div>
        <LayoutHeaderMainMenuBanners />
      </div>
    </div>
    <div
      class="hidden relative z-30 col-start-2 row-start-1 grid-cols-[1fr_340px] gap-[25px] bg-card font-Inter max-h-[calc(100vh-178px)] overflow-y-auto scrollbar-thin rounded-br-md transition-all duration-500 xl:grid xl:gap-0"
      :class="[selectedCategory ? '' : 'opacity-0 pointer-events-none -translate-x-10']"
    >
      <div>
        <div class="flex items-center justify-between border-b border-gray-200 px-[15px] pt-5 pb-2.5 xl:pr-0">
          <UiButton
            variant="ghost"
            size="icon"
            class="h-auto w-auto"
            :aria-label="selectedSubCategory ? `Back to ${selectedCategory?.name}` : 'Back to all categories'"
            @click="selectedSubCategory ? (selectedSubCategory = null) : (selectedCategory = null)"
          >
            <CaretLeft class="w-6 h-6" />
          </UiButton>
          <div class="text-sm font-semibold text-primary">
            {{ selectedSubCategory ? selectedSubCategory.name : selectedCategory?.name }}
          </div>
        </div>
        <div class="flex flex-col flex-1">
          <div class="flex-1 overflow-y-auto scrollbar-thin">
            <div v-if="selectedCategory" class="flex flex-wrap gap-2.5 pt-[15px] px-[25px] pb-5">
              <UiButton
                v-for="(subCategory, index) in selectedCategory.subcategory"
                :key="index"
                variant="ghost"
                class="group h-auto px-2 py-1.5 rounded-[5px] text-muted-foreground text-left hover:text-primary"
                :class="[selectedSubCategory === subCategory ? 'text-primary bg-accent' : '']"
                @click="selectedSubCategory = subCategory"
              >
                <div>
                  <div class="text-sm font-semibold mb-2">
                    {{ subCategory.name }}
                  </div>
                  <div
                    class="text-xs font-semibold transition-colors duration-300 group-hover:text-muted-foreground"
                    :class="[selectedSubCategory === subCategory ? 'text-muted-foreground' : 'text-muted-foreground']"
                  >
                    {{ subCategory.productCount }} items
                  </div>
                </div>
              </UiButton>
            </div>
            <div v-if="selectedCategory && selectedSubCategory" class="grid grid-cols-3 gap-x-5 gap-y-2 px-[25px] pb-5">
              <NuxtLink
                v-for="(subCategory, index) in selectedSubCategory.subcategory"
                :key="index"
                :to="`/search?keyword=${encodeURIComponent(subCategory.name)}`"
                class="relative flex items-start text-[#6E6E6E] text-left px-[5px] transition-colors duration-300 hover:text-primary"
              >
                <div class="text-sm font-medium truncate mr-[5px]">{{ subCategory.name }} ({{ subCategory.productCount }} items)</div>
                <!--                                <div -->
                <!--                                    v-if="index === 3 || index === 5" -->
                <!--                                    class="bg-primary text-primary-foreground rounded-full px-[5px] py-px font-Inter font-semibold text-xs leading-tight" -->
                <!--                                > -->
                <!--                                    New -->
                <!--                                </div> -->
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
      <LayoutHeaderMainMenuBanners />
    </div>
  </div>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { useRouter } from 'vue-router';
import type { Component } from 'vue';
import SemiconductorsIcon from '@/assets/icons/header/semiconductors.svg';
import PassiveIcon from '@/assets/icons/header/passive.svg';
import ElectromechanicsIcon from '@/assets/icons/header/electromechanics.svg';
import CardPlaceholderSmall from '@/assets/icons/card-placeholder-small.svg';
import CablesAndConnectorsIcon from '@/assets/icons/header/cables-and-connectors.svg';
import PowerSupplyIcon from '@/assets/icons/header/power-supply.svg';
import CasesIcon from '@/assets/icons/header/cases.svg';
import ToolsIcon from '@/assets/icons/header/tools.svg';
import IndustrialFurnitureIcon from '@/assets/icons/header/industrial-furniture.svg';
import CaretLeft from '@/assets/icons/caret-left.svg';
import SlideBg from '@/assets/media/home/exclusive-offer-bg.webp';
import ItemImage from '@/assets/media/home/exclusive-offer-item.png';
import CablesAndConnectorsIcon2 from '@/assets/icons/header/banner/cables-and-connectors.svg';
import OptoelectronicsIcon2 from '@/assets/icons/header/banner/optoelectronics.svg';
import ToolsIcon2 from '@/assets/icons/header/banner/tools.svg';
import IndustrialFurnitureIcon2 from '@/assets/icons/header/banner/industrial-furniture.svg';
import PowerSupplyIcon2 from '@/assets/icons/header/banner/power-supply.svg';
import DiodesIcon2 from '@/assets/icons/header/banner/diodes.svg';
import { showNavModal } from '~/config/modal/nav';
import type { NavCategoryView, TaxonomyInterface } from '~~/types/dashboard/categories';
import { mapLabelsToIds } from '~~/helpers/categories.helper';

const router = useRouter();

const DefaultIcon = CardPlaceholderSmall;

const props = defineProps({
  isStatic: {
    type: Boolean,
    required: false,
  },
});

const handleCategoryClick = (category: NavCategoryView) => {
  if ((category.subcategory?.length ?? 0) === 0) {
    // Redirect to the category link if it's the last level
    router.push(`/search?keyword=${encodeURIComponent(category.name)}`);
  } else {
    // Otherwise, set the selected category or subcategory as usual
    selectedCategory.value = category;
    selectedSubCategory.value = null;
  }
};

const iconMap = {
  Semiconductors: SemiconductorsIcon,
  Passive: PassiveIcon,
  Electromechanics: ElectromechanicsIcon,
  'Cables & Connectors': CablesAndConnectorsIcon,
  'Power Supply': PowerSupplyIcon,
  Cases: CasesIcon,
  Tools: ToolsIcon,
  'Industrial Furniture': IndustrialFurnitureIcon,
};

const { categories, getCategories } = useCategories();
const allCategories = ref<NavCategoryView[]>([]);

const mapCategories = (sourceArray: TaxonomyInterface[]): NavCategoryView[] => {
  return sourceArray.map((item) => ({
    name: item.name.trim(),
    productCount: item.productCount,
    icon: (iconMap[item.name.trim() as keyof typeof iconMap] || DefaultIcon) as Component,
    subcategory: item.subcategory ? mapCategories(item.subcategory) : [],
    id: item.id,
    path: item.path,
    isPublished: item.isPublished,
  }));
};

const setCategories = async () => {
  await getCategories();
  allCategories.value = mapCategories(categories.value);
  mapLabelsToIds(categories.value);
};

const selectedCategory = ref<NavCategoryView | null>(null);
const selectedSubCategory = ref<NavCategoryView | null>(null);

const slides = ref([
  {
    title: 'Cables & Connectors',
    icon: CablesAndConnectorsIcon2,
  },
  {
    title: 'Optoelectronics',
    icon: OptoelectronicsIcon2,
  },
  {
    title: 'Tools',
    icon: ToolsIcon2,
  },
  {
    title: 'Industrial Furniture',
    icon: IndustrialFurnitureIcon2,
  },
  {
    title: 'Power Supply',
    icon: PowerSupplyIcon2,
  },
  {
    title: 'Diodes',
    icon: DiodesIcon2,
  },
  {
    title: 'Cables & Connectors',
    icon: CablesAndConnectorsIcon2,
  },
  {
    title: 'Optoelectronics',
    icon: OptoelectronicsIcon2,
  },
  {
    title: 'Tools',
    icon: ToolsIcon2,
  },
  {
    title: 'Industrial Furniture',
    icon: IndustrialFurnitureIcon2,
  },
  {
    title: 'Power Supply',
    icon: PowerSupplyIcon2,
  },
  {
    title: 'Diodes',
    icon: DiodesIcon2,
  },
]);

const handleClickOutside = () => {
  if (!props.isStatic && window.innerWidth >= 768) {
    showNavModal.value = false;
  } else if ((props.isStatic && selectedCategory) || selectedSubCategory) {
    selectedCategory.value = null;
    selectedSubCategory.value = null;
  }
};

const isBannerExpanded = ref(false);
const handleTogglerMouseEnter = (event: MouseEvent) => {
  const svg = (event.target as HTMLInputElement).querySelector('svg');
  if (isBannerExpanded.value) {
    svg?.classList.add('animateToRight');
  } else {
    svg?.classList.add('animateToLeft');
  }

  isMouseOverToggler.value = true;
};

const isMouseOverToggler = ref<boolean | null>(null);
const handleTogglerMouseLeave = (event: MouseEvent) => {
  const svg = (event.target as HTMLInputElement).querySelector('svg');

  svg?.classList.remove('animateToRight', 'animateToLeft');

  isMouseOverToggler.value = null;
};

const swiperDOM = ref<{ destroy?: () => void } | null>(null);

onMounted(async () => {
  await setCategories();

  if (swiperDOM.value) {
    swiperDOM.value.destroy = () => {};
  }
});
</script>

<style>
@reference "../../../../assets/css/main.css";
.headerSubmenu--swiper {
  @apply z-20 pb-[22px] mt-auto md:pb-[38px]!;
}

.headerSubmenu--swiper .swiper-slide {
  @apply h-auto!;
}

.headerSubmenu--swiper .swiper-pagination {
  @apply flex justify-center w-full h-2 bottom-1.5 space-x-1.5 md:space-x-2 md:bottom-[15px]!;
}

.headerSubmenu--swiper .swiper-pagination-bullet {
  @apply w-1.5 h-1.5 bg-gray-500 rounded-full opacity-100 m-0 transition-all duration-300 md:w-2 md:h-2!;
  margin-right: 0 !important;
}

.headerSubmenu--swiper .swiper-pagination-bullet.swiper-pagination-bullet-active {
  @apply scale-125 bg-card!;
}
</style>

<style>
@reference "../../../../assets/css/main.css";
.animateToRight {
  animation: toRightFromLeft 0.5s forwards linear;
}

.animateToLeft {
  animation: toLeftFromRight 0.5s forwards linear;
}

@keyframes toLeftFromRight {
  49% {
    @apply -translate-x-full rotate-180;
    -webkit-transform: translateX(-100%) rotate(180deg);
  }

  50% {
    @apply opacity-0 translate-x-full rotate-180;
    -webkit-transform: translateX(100%) rotate(180deg);
  }

  51% {
    @apply opacity-100;
  }
}

@keyframes toRightFromLeft {
  49% {
    @apply translate-x-full;
    -webkit-transform: translateX(100%);
  }

  50% {
    @apply opacity-0 -translate-x-full;
    -webkit-transform: translateX(-100%);
  }

  51% {
    @apply opacity-100;
  }
}

.sideNav--toggler_active {
  @keyframes toLeftFromRight {
    49% {
      @apply -translate-x-full;
    }

    50% {
      @apply opacity-0 translate-x-full;
    }

    51% {
      @apply opacity-100;
    }
  }

  @keyframes toRightFromLeft {
    49% {
      @apply translate-x-full;
    }

    50% {
      @apply opacity-0 -translate-x-full;
    }

    51% {
      @apply opacity-100;
    }
  }
}
</style>
