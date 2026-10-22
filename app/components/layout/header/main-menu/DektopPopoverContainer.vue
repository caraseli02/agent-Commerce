<script setup lang="ts">
import type { Component } from 'vue';
import { Building2Icon, ChevronRight, GemIcon, HeadsetIcon } from '@lucide/vue';
import CardPlaceholderSmall from '@/assets/icons/card-placeholder-small.svg';
import SemiconductorsIcon from '@/assets/icons/header/semiconductors.svg';
import PassiveIcon from '@/assets/icons/header/passive.svg';
import CablesAndConnectorsIcon from '@/assets/icons/header/cables-and-connectors.svg';
import ElectromechanicsIcon from '@/assets/icons/header/electromechanics.svg';
import PowerSupplyIcon from '@/assets/icons/header/power-supply.svg';
import CasesIcon from '@/assets/icons/header/cases.svg';
import ToolsIcon from '@/assets/icons/header/tools.svg';
import IndustrialFurnitureIcon from '@/assets/icons/header/industrial-furniture.svg';
import type { TaxonomyInterface } from '~~/types/dashboard/categories';

const { selectedCategories, onCategoryClick, browseCategory } = useCategoriesNavigation();
const { categories, getCategories, isLoading } = useCategories();

const SKELETON_ROW_COUNT = 9;

const categoryIconMap: Record<string, Component> = {
  Semiconductors: SemiconductorsIcon,
  Passive: PassiveIcon,
  Passives: PassiveIcon,
  Electromechanics: ElectromechanicsIcon,
  Connectors: CablesAndConnectorsIcon,
  'Cables & Connectors': CablesAndConnectorsIcon,
  'Power Supply': PowerSupplyIcon,
  Cases: CasesIcon,
  Tools: ToolsIcon,
  'Industrial Furniture': IndustrialFurnitureIcon,
};

const getCategoryIcon = (category: TaxonomyInterface) => categoryIconMap[category.name?.trim() ?? ''] ?? CardPlaceholderSmall;

const isSelected = (categoryId: string) => selectedCategories.value.some((category) => (category as TaxonomyInterface).id === categoryId);
const hasSelection = computed(() => selectedCategories.value.length > 0);
const currentCategory = computed((): TaxonomyInterface | null => {
  if (!selectedCategories.value.length) {
    return null;
  }
  return selectedCategories.value[selectedCategories.value.length - 1] as TaxonomyInterface;
});
const currentChildren = computed((): TaxonomyInterface[] => {
  return Array.isArray(currentCategory.value?.subcategory) ? currentCategory.value.subcategory : [];
});
const selectedDetailColumns = computed(() => {
  return currentChildren.value.map((child: TaxonomyInterface) => {
    const descendants = Array.isArray(child.subcategory) ? child.subcategory : [];
    return {
      id: child.id,
      source: child,
      title: child.name,
      count: child.productCount,
      entries: descendants.length > 0 ? descendants : [child],
    };
  });
});
const breadcrumbTrail = computed(() => selectedCategories.value.map((category) => (category as TaxonomyInterface).name));
const formatItemCount = (count?: number) => {
  const value = Number(count ?? 0);
  const label = value === 1 ? 'item' : 'items';
  return `${value.toLocaleString()} ${label}`;
};
const handleRootClick = (category: TaxonomyInterface) => onCategoryClick(category, true);
const handleChildClick = (category: TaxonomyInterface) => onCategoryClick(category, false);
const handleViewAll = (category: TaxonomyInterface) => browseCategory(category);
const resetSelection = () => (selectedCategories.value = []);

void getCategories();
</script>

<template>
  <div class="font-Poppins mt-3">
    <section
      class="grid grid-cols-[minmax(280px,320px)_1fr] h-[min(480px,70vh)] min-h-[420px] p-2 bg-muted rounded-2xl border border-border shadow-[0_2px_6px_rgba(15,23,42,0.06)] overflow-hidden"
    >
      <div
        class="h-full min-h-0 pr-2 border-r border-border overflow-y-auto scrollbar-thin"
        role="navigation"
        aria-label="Product categories"
        :aria-busy="isLoading"
      >
        <div v-if="isLoading" class="space-y-0" aria-live="polite">
          <div
            v-for="n in SKELETON_ROW_COUNT"
            :key="`category-skeleton-${n}`"
            class="w-full h-[58px] flex items-center justify-between gap-3 px-3 py-2"
            aria-hidden="true"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <UiSkeleton class="w-6 h-6 flex-shrink-0 rounded-md" />
              <div class="min-w-0 flex-1 space-y-1.5">
                <UiSkeleton class="h-3.5 rounded" :class="n % 3 === 0 ? 'w-[55%]' : n % 3 === 1 ? 'w-[70%]' : 'w-[62%]'" />
                <UiSkeleton class="h-3 w-[38%] rounded" />
              </div>
            </div>
            <UiSkeleton class="w-5 h-5 flex-shrink-0 rounded" />
          </div>
          <span class="sr-only">Loading categories…</span>
        </div>
        <UiButton
          v-for="category in categories"
          v-else
          :key="category.id"
          type="button"
          variant="ghost"
          class="group w-full h-[58px] justify-between gap-3 px-3 py-2 rounded-xl text-left"
          :class="isSelected(category.id) ? 'bg-card' : ''"
          :aria-pressed="isSelected(category.id)"
          @click="handleRootClick(category)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <component
              :is="getCategoryIcon(category)"
              class="w-6 h-6 flex-shrink-0"
              :class="isSelected(category.id) ? 'text-primary' : 'text-foreground'"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <div
                class="text-[13px] leading-[1.2] font-semibold truncate"
                :class="isSelected(category.id) ? 'text-primary' : 'text-foreground'"
              >
                {{ category.name }}
              </div>
              <div
                class="text-[11px] leading-[1.2] font-medium mt-0.5"
                :class="isSelected(category.id) ? 'text-primary/90' : 'text-muted-foreground'"
              >
                {{ formatItemCount(category.productCount) }}
              </div>
            </div>
          </div>
          <ChevronRight
            class="w-5 h-5 flex-shrink-0 transition-colors duration-200"
            :class="isSelected(category.id) ? 'text-primary' : 'text-foreground'"
            aria-hidden="true"
          />
        </UiButton>
      </div>
      <div class="h-full min-h-0 pl-2">
        <LayoutHeaderMainMenuBannerNew v-if="!hasSelection" class="h-full" />
        <div v-else class="h-full bg-card rounded-xl border border-border overflow-hidden flex flex-col">
          <div class="h-12 px-5 border-b border-border flex items-center justify-between gap-3 shrink-0">
            <div class="text-[15px] leading-none font-medium text-muted-foreground truncate">
              <span class="text-muted-foreground">Main Category</span>
              <span v-for="(crumb, index) in breadcrumbTrail" :key="`${crumb}-${index}`">
                <span class="mx-2 text-muted-foreground/60" aria-hidden="true">&gt;</span>
                <span :class="index === breadcrumbTrail.length - 1 ? 'text-foreground font-semibold' : ''">{{ crumb }}</span>
              </span>
            </div>
            <UiButton type="button" variant="outline" size="xs" class="shrink-0" @click="resetSelection"> All Categories </UiButton>
          </div>

          <div class="flex-1 overflow-y-auto p-5 min-h-0">
            <div v-if="selectedDetailColumns.length" class="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-3 xl:grid-cols-4">
              <div v-for="column in selectedDetailColumns" :key="column.id" class="space-y-2.5">
                <h4 class="text-[14px] leading-[1.3] font-semibold text-foreground truncate">
                  {{ column.title }}
                </h4>
                <UiButton
                  v-for="entry in column.entries"
                  :key="entry.id"
                  type="button"
                  variant="ghost"
                  class="group block h-auto w-full p-0 text-left"
                  @click="handleChildClick(entry)"
                >
                  <div class="text-[13px] leading-[1.3] font-medium text-foreground group-hover:text-primary truncate">
                    {{ entry.name }}
                  </div>
                  <div class="text-[11px] leading-[1.3] font-medium text-muted-foreground mt-0.5">
                    {{ formatItemCount(entry.productCount) }}
                  </div>
                </UiButton>
                <UiButton type="button" variant="link" class="h-auto p-0 text-[13px] text-primary" @click="handleViewAll(column.source)">
                  View all
                </UiButton>
              </div>
            </div>
            <div v-else class="text-[14px] text-muted-foreground">No subcategories available.</div>
          </div>
          <div class="px-5 py-3 border-t border-border bg-muted/40 shrink-0">
            <div class="flex items-center gap-4 flex-wrap">
              <NuxtLink
                to="/search"
                class="text-[13px] leading-none font-medium text-foreground hover:text-primary inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                <GemIcon class="w-4 h-4" aria-hidden="true" />
                View our discounted offers
              </NuxtLink>
              <LayoutHeaderMainMenuOffersSvgs />
              <div class="ml-auto flex items-center gap-4">
                <a
                  href="tel:+18005550199"
                  class="text-xs leading-none font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                >
                  <Building2Icon class="w-4 h-4" aria-hidden="true" />
                  Contact Sales
                </a>
                <a
                  href="tel:+18005550199"
                  class="text-xs leading-none font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                >
                  <HeadsetIcon class="w-4 h-4" aria-hidden="true" />
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
