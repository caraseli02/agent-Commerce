<template>
  <section class="border-b border-border bg-card md:-mt-5">
    <!-- md:-mt-5 cancels the 20px between the fixed 110px header and main's md:pt-[130px] (layouts/default.vue). -->
    <div class="container pt-9 md:pt-14 lg:pt-16">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:gap-14 xl:gap-24">
        <div class="min-w-0">
          <h1
            class="max-w-[15ch] text-balance font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[50px] lg:text-[62px]"
          >
            Source the right part, <span class="text-muted-foreground">with evidence.</span>
          </h1>
          <p class="mt-5 max-w-[56ch] text-base leading-7 text-muted-foreground md:mt-6 md:text-lg md:leading-8">
            Search by part number or keyword, then compare specifications, stock, volume pricing, and manufacturers before you buy.
          </p>

          <form class="mt-8 max-w-2xl md:mt-9" novalidate @submit.prevent="submitSearch">
            <UiLabel for="homepage-part-search" class="sr-only">Search by part number or keyword</UiLabel>
            <div class="flex flex-col gap-2 sm:flex-row">
              <div class="min-w-0 flex-1 rounded-lg text-base text-foreground shadow-xs">
                <UiInput
                  id="homepage-part-search"
                  ref="searchInput"
                  v-model="searchTerm"
                  type="search"
                  autocomplete="off"
                  placeholder="e.g. STM32F407, BAT54C, USB-C"
                  class="h-12 w-full"
                  :aria-invalid="Boolean(searchError)"
                  aria-describedby="homepage-search-help homepage-search-error"
                />
              </div>
              <UiButton type="submit" variant="cart" size="lg" class="h-12 w-full sm:w-auto">
                <SearchIcon class="mr-2 h-4 w-4" aria-hidden="true" />
                Search catalog
              </UiButton>
            </div>
            <p id="homepage-search-help" class="mt-3 text-sm text-muted-foreground">
              Use a manufacturer part number for the most precise match.
            </p>
            <p v-if="searchError" id="homepage-search-error" class="mt-2 text-sm font-medium text-destructive-text" role="alert">
              {{ searchError }}
            </p>
          </form>

          <div class="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span id="homepage-popular-searches" class="text-sm text-muted-foreground">Popular:</span>
            <ul aria-labelledby="homepage-popular-searches" class="flex flex-wrap gap-2">
              <li v-for="term in popularSearches" :key="term">
                <NuxtLink
                  :to="{ path: '/search', query: { keyword: term } }"
                  class="inline-flex min-h-10 items-center rounded-full border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors duration-150 hover:border-input hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none md:min-h-8"
                >
                  {{ term }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <nav aria-labelledby="homepage-categories-heading" class="min-w-0 rounded-2xl border border-border bg-background p-2 sm:p-2.5">
          <h2
            id="homepage-categories-heading"
            class="px-3 pb-2 pt-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:pt-1.5"
          >
            Browse categories
          </h2>
          <ul class="grid gap-0.5">
            <li v-for="(category, index) in categoryLinks" :key="category.path" :class="{ 'max-md:hidden': index >= 4 }">
              <NuxtLink
                :to="categoryBrowseUrl(category)"
                class="group flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-[background-color,box-shadow] duration-150 hover:bg-card hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-150 group-hover:text-signal-text"
                >
                  <component :is="category.icon" class="h-[18px] w-[18px]" :stroke-width="1.75" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-[15px] font-semibold leading-5 text-foreground">{{ category.name }}</span>
                  <span v-if="category.hint" class="block truncate text-sm leading-5 text-muted-foreground">{{ category.hint }}</span>
                </span>
                <ChevronRight
                  class="h-4 w-4 shrink-0 text-muted-foreground transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </NuxtLink>
            </li>
          </ul>
          <NuxtLink
            to="/search"
            class="mt-1 flex min-h-11 items-center justify-between rounded-xl border-t border-border px-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-card hover:text-signal-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            All categories
            <ArrowRight class="h-4 w-4" aria-hidden="true" />
          </NuxtLink>
        </nav>
      </div>

      <ul
        class="mt-12 grid gap-3 border-t border-border py-5 text-sm text-muted-foreground md:mt-14 md:grid-cols-3 md:gap-6 md:py-6 lg:mt-16"
      >
        <li v-for="fact in facts" :key="fact.text" class="flex items-center gap-2.5">
          <component :is="fact.icon" class="h-4 w-4 shrink-0 text-foreground" :stroke-width="1.75" aria-hidden="true" />
          <span>{{ fact.text }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import {
  ArrowRight,
  Cable,
  ChevronRight,
  CircuitBoard,
  Cpu,
  FlaskConical,
  Headphones,
  House,
  Lamp,
  Monitor,
  Mouse,
  Package,
  PackageCheck,
  Plug,
  Tags,
  Watch,
  Wrench,
} from '@lucide/vue';
import SearchIcon from '@/assets/icons/search.svg';
import { categoryBrowseUrl } from '~~/helpers/categoryPath.helper';
import { buildDemoTaxonomyTree } from '~~/data/demoTaxonomyTree';
import type { TaxonomyInterface } from '~~/types/dashboard/categories';

const router = useRouter();
const config = useRuntimeConfig();
const { categories, getCategories } = useCategories();
const searchInput = ref<{ el: HTMLInputElement | null } | null>(null);
const searchTerm = ref('');
const searchError = ref('');

// Each term returns results in the sample catalog.
const popularSearches = ['STM32F407', 'RS-485', 'Schottky', 'USB-C'];

const facts = [
  { icon: PackageCheck, text: 'Stock shown on every listing' },
  { icon: Tags, text: 'Volume price breaks on product pages' },
  { icon: FlaskConical, text: 'Sample catalog with test checkout. No real payments.' },
];

const categoryIcons: Record<string, Component> = {
  semiconductors: Cpu,
  passives: CircuitBoard,
  connectors: Plug,
  components: Mouse,
  electronics: Monitor,
  audio: Headphones,
  accessories: Cable,
  tools: Wrench,
  wearables: Watch,
  home: House,
  office: Lamp,
};
const preferredOrder = Object.keys(categoryIcons);

type CategoryLink = { name: string; path: string; hint: string; icon: Component };

// In mock mode the store loads this same deterministic demo tree, so server and client
// render identical rows before it arrives. A live catalog renders its own rows once loaded.
const categoryLinks = computed<CategoryLink[]>(() => {
  const fallback = config.public.MOCK_MODE ? buildDemoTaxonomyTree() : [];
  const source: TaxonomyInterface[] = categories.value.length ? categories.value : fallback;
  const rank = (category: TaxonomyInterface) => {
    const index = preferredOrder.indexOf(category.alias ?? category.path);
    return index === -1 ? preferredOrder.length : index;
  };

  return source
    .filter((category) => category.productCount !== 0)
    .sort((a, b) => rank(a) - rank(b) || (b.productCount ?? 0) - (a.productCount ?? 0))
    .slice(0, 6)
    .map((category) => ({
      name: category.name,
      path: category.path,
      hint: (category.subcategory ?? [])
        .slice(0, 3)
        .map((child) => child.name)
        .join(', '),
      icon: categoryIcons[category.alias ?? category.path] ?? Package,
    }));
});

const submitSearch = async () => {
  const keyword = searchTerm.value.trim();
  if (!keyword) {
    searchError.value = 'Enter a part number or keyword to search.';
    await nextTick();
    searchInput.value?.el?.focus();
    return;
  }

  searchError.value = '';
  await router.push({ path: '/search', query: { keyword } });
};

// Once a term is typed the empty-search error no longer applies (#790).
watch(searchTerm, (term) => {
  if (term.trim()) searchError.value = '';
});

onMounted(() => {
  void getCategories();
});
</script>
