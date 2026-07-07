<script setup lang="ts">
import { Building2Icon, ChevronRight, GemIcon, HeadsetIcon } from 'lucide-vue-next';
import CardPlaceholderSmall from '@/assets/icons/card-placeholder-small.svg';
import type { TaxonomyInterface } from '~/types/dashboard/categories';

const { selectedCategories, onCategoryClick } = useCategoriesNavigation();
const { categories, getCategories } = useCategories();

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
  const total = Number(count ?? 0);
  const label = total === 1 ? 'item' : 'items';
  return `${total.toLocaleString()} ${label}`;
};
const handleRootClick = (category: TaxonomyInterface) => onCategoryClick(category, true);
const handleChildClick = (category: TaxonomyInterface) => onCategoryClick(category, false);
const resetSelection = () => (selectedCategories.value = []);

onMounted(async () => {
  await getCategories();
});
</script>

<template>
  <div class="font-Poppins mt-3">
    <section
      class="grid grid-cols-[372px_1fr] h-[620px] p-2 bg-[#F6F7F9] rounded-2xl border border-[#DEE1E6] shadow-[0_2px_6px_rgba(15,23,42,0.06)] overflow-hidden"
    >
      <div class="h-full pr-2 border-r border-[#D5D8DD] overflow-y-auto scrollbar-thin">
        <button
          v-for="category in categories"
          :key="category.id"
          class="group w-full h-[58px] flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors duration-200 hover:bg-[#ECEFF3]"
          :class="isSelected(category.id) ? 'bg-[#ECEFF3]' : ''"
          @click="handleRootClick(category)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <CardPlaceholderSmall class="w-6 h-6 flex-shrink-0" :class="isSelected(category.id) ? 'text-primary' : 'text-[#2D3340]'" />
            <div class="min-w-0">
              <div
                class="text-[13px] leading-[1.2] font-semibold truncate"
                :class="isSelected(category.id) ? 'text-primary' : 'text-[#2B303B]'"
              >
                {{ category.name }}
              </div>
              <div
                class="text-[11px] leading-[1.2] font-medium mt-0.5"
                :class="isSelected(category.id) ? 'text-primary/90' : 'text-[#6E7482]'"
              >
                {{ formatItemCount(category.productCount) }}
              </div>
            </div>
          </div>
          <ChevronRight
            class="w-5 h-5 flex-shrink-0 transition-colors duration-200"
            :class="isSelected(category.id) ? 'text-primary' : 'text-[#2D3340]'"
          />
        </button>
      </div>
      <LayoutHeaderMainMenuBannerNew v-if="!hasSelection" />
      <div v-else class="h-full bg-white rounded-xl border border-[#E1E4EA] overflow-hidden flex flex-col">
        <div class="h-12 px-5 border-b border-[#E8EBEF] flex items-center justify-between">
          <div class="text-[15px] leading-none font-medium text-[#5E6572] truncate">
            <span class="text-[#8A90A0]">Main Category</span>
            <span v-for="(crumb, index) in breadcrumbTrail" :key="`${crumb}-${index}`">
              <span class="mx-2 text-[#B1B6C2]">&gt;</span>
              <span :class="index === breadcrumbTrail.length - 1 ? 'text-[#2D3340] font-semibold' : ''">{{ crumb }}</span>
            </span>
          </div>
          <button
            class="h-8 px-3 rounded-lg border border-[#D8DCE5] text-[13px] font-medium text-[#5E6572] hover:bg-[#F5F7FA] transition-colors"
            @click="resetSelection"
          >
            All Categories
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5">
          <div v-if="selectedDetailColumns.length" class="grid grid-cols-4 gap-x-8 gap-y-5">
            <div v-for="column in selectedDetailColumns" :key="column.id" class="space-y-2.5">
              <h4 class="text-[14px] leading-[1.3] font-semibold text-[#2D3340] truncate">
                {{ column.title }}
              </h4>
              <button v-for="entry in column.entries" :key="entry.id" class="text-left group block w-full" @click="handleChildClick(entry)">
                <div class="text-[13px] leading-[1.3] font-medium text-[#464D5A] group-hover:text-primary truncate">
                  {{ entry.name }}
                </div>
                <div class="text-[11px] leading-[1.3] font-medium text-[#8A90A0] mt-0.5">
                  {{ formatItemCount(entry.productCount) }}
                </div>
              </button>
              <button class="text-[13px] font-medium text-primary hover:text-primary/80" @click="handleChildClick(column.source)">
                View all
              </button>
            </div>
          </div>
          <div v-else class="text-[14px] text-[#7B8290]">No subcategories available.</div>
        </div>
        <div class="px-5 py-3 border-t border-[#E8EBEF] bg-[#FBFCFD]">
          <div class="flex items-center gap-4">
            <button class="text-[13px] leading-none font-medium text-[#2D3340] hover:text-primary inline-flex items-center gap-2">
              <GemIcon class="w-4 h-4" />
              View our discounted offers
            </button>
            <LayoutHeaderMainMenuOffersSvgs />
            <div class="ml-auto flex items-center gap-4">
              <button class="text-xs leading-none font-medium text-[#6F7685] hover:text-primary inline-flex items-center gap-1.5">
                <Building2Icon class="w-4 h-4" />
                Contact Sales
              </button>
              <button class="text-xs leading-none font-medium text-[#6F7685] hover:text-primary inline-flex items-center gap-1.5">
                <HeadsetIcon class="w-4 h-4" />
                Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
