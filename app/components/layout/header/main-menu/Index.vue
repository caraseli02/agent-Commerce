<template>
  <div class="fixed z-[60] top-0 left-0 w-screen h-screen flex flex-col bg-white md:hidden">
    <div class="flex items-center justify-between px-5 pt-[15px] pb-[15px] border-b border-gray-200 mb-[15px] md:hidden">
      <div v-if="!selectedCategory" class="text-lg font-semibold text-slate-500">Products</div>
      <template v-else>
        <UiButton
          variant="ghost"
          size="icon"
          class="h-auto w-auto"
          @click="selectedSubCategory ? (selectedSubCategory = null) : (selectedCategory = null)"
        >
          <CaretLeft class="w-6 h-6" />
        </UiButton>
        <div class="flex items-center text-primary">
          <component :is="selectedCategory.icon" v-if="!selectedSubCategory" class="w-[22px] h-[22px] mr-1.5" />
          <div class="text-sm font-semibold">
            {{ selectedSubCategory ? selectedSubCategory.name : selectedCategory.name }}
          </div>
        </div>
      </template>
      <UiButton variant="secondary" size="icon" class="h-8 w-8 rounded text-gray-500" @click="showNavModal = false">
        <XIcon class="w-[15px] h-[15px]" />
      </UiButton>
    </div>
    <div
      class="flex-1 flex flex-col gap-1.5 font-Inter overflow-y-auto scrollbar-thin pl-2.5 pr-[15px] pb-[15px] border-b border-gray-200 mb-[15px]"
    >
      <template v-if="!selectedCategory">
        <UiButton
          v-for="(category, index) in allCategories"
          :key="index"
          variant="ghost"
          class="group h-auto justify-start px-2.5 py-[5px] rounded-[5px] w-full text-slate-500 text-left hover:text-primary"
          @click="
            selectedCategory = category;
            handleCategoryClick(category);
          "
        >
          <div class="flex items-center justify-center w-[34px] h-[34px] rounded bg-gray-100 mr-2">
            <component :is="category.icon" class="w-7 h-7" />
          </div>
          <div>
            <div class="text-[15px] font-semibold mb-px">
              {{ category.name }}
            </div>
            <div class="text-xs font-semibold text-gray-500 transition-colors duration-300 group-hover:text-slate-500">
              {{ category.productCount }} products
            </div>
          </div>
        </UiButton>
      </template>
      <template v-else-if="selectedCategory && !selectedSubCategory">
        <UiButton
          v-for="(subCategory, index) in selectedCategory.subcategory"
          :key="index"
          variant="ghost"
          class="group h-auto justify-start px-2.5 py-[5px] rounded-[5px] w-full text-slate-500 text-left hover:text-primary"
          @click="
            selectedSubCategory = subCategory;
            handleCategoryClick(subCategory);
          "
        >
          <div>
            <div class="text-[15px] font-semibold mb-px">
              {{ subCategory.name }}
            </div>
            <div class="text-xs font-semibold text-gray-500 transition-colors duration-300 group-hover:text-slate-500">
              {{ subCategory.productCount }} products
            </div>
          </div>
        </UiButton>
      </template>
      <template v-else-if="selectedSubCategory">
        <NuxtLink
          v-for="(subCategory, index) in selectedSubCategory.subcategory"
          :key="index"
          :to="categoryBrowseUrl(subCategory)"
          class="group flex items-center justify-between px-2.5 py-[5px] rounded-[5px] w-full text-slate-500 text-left transition-colors duration-300 hover:bg-[#F4F4F4] hover:text-primary"
        >
          <div>
            <div class="text-[15px] font-semibold mb-px">{{ subCategory.name }}</div>
            <div class="text-xs font-semibold text-gray-500 transition-colors duration-300 group-hover:text-slate-500">
              {{ subCategory.productCount }} products
            </div>
          </div>
        </NuxtLink>
      </template>
    </div>
    <div v-if="!selectedCategory">
      <div class="bg-primary px-5 pt-[17px] pb-[21px] text-xs font-semibold text-primary-foreground text-center">
        Sales: +1 800 555 0199 (Mon-Fri 8:00AM - 4:00PM EST)
      </div>
    </div>
    <LayoutHeaderMainMenuBanners v-else />
  </div>
</template>

<script setup lang="ts">
import CardPlaceholderSmall from 'assets/icons/card-placeholder-small.svg';
import { useRouter } from 'vue-router';
import type { Component } from 'vue';
import SemiconductorsIcon from '@/assets/icons/header/semiconductors.svg';
import PassiveIcon from '@/assets/icons/header/passive.svg';
import ElectromechanicsIcon from '@/assets/icons/header/electromechanics.svg';
import CablesAndConnectorsIcon from '@/assets/icons/header/cables-and-connectors.svg';
import PowerSupplyIcon from '@/assets/icons/header/power-supply.svg';
import CasesIcon from '@/assets/icons/header/cases.svg';
import ToolsIcon from '@/assets/icons/header/tools.svg';
import IndustrialFurnitureIcon from '@/assets/icons/header/industrial-furniture.svg';
import CaretLeft from '@/assets/icons/caret-left.svg';
import { showNavModal } from '~/config/modal/nav';
import type { NavCategoryView, TaxonomyInterface } from '~~/types/dashboard/categories';
import { mapLabelsToIds } from '~~/helpers/categories.helper';
import { categoryBrowseUrl } from '~~/helpers/categoryPath.helper';

const router = useRouter();

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

const DefaultIcon = CardPlaceholderSmall;

const handleCategoryClick = (category: NavCategoryView) => {
  if ((category.subcategory?.length ?? 0) === 0) {
    // Redirect to the category link if it's the last level
    router.push(categoryBrowseUrl(category));
    showNavModal.value = false;
  } else {
    // Otherwise, set the selected category or subcategory as usual
    selectedCategory.value = category;
    selectedSubCategory.value = null;
  }
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

onMounted(async () => {
  await setCategories();
});

const selectedCategory = ref<NavCategoryView | null>(null);
const selectedSubCategory = ref<NavCategoryView | null>(null);
</script>
