<template>
  <section class="mb-10 max-md:pt-4 md:mb-14 xl:mb-16">
    <div class="container">
      <div
        class="relative overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1930] px-5 py-7 text-white shadow-[0_12px_30px_rgba(15,23,42,0.14)] sm:px-8 sm:py-8 md:px-12 md:py-12 xl:px-16 xl:py-14"
      >
        <div
          class="pointer-events-none absolute -right-20 -top-24 hidden h-72 w-72 rounded-full border border-blue-300/15 md:block md:h-96 md:w-96"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute -bottom-32 right-24 hidden h-64 w-64 rounded-full border border-cyan-200/10 md:block"
          aria-hidden="true"
        />
        <div class="relative z-10 max-w-4xl">
          <h1 class="max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-4xl md:text-5xl xl:text-[56px]">
            Source the right part, with evidence.
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-4 sm:text-base md:mt-5 md:text-lg md:leading-7">
            Search by part number or keyword, then compare specifications, stock, and manufacturers before you buy.
          </p>

          <form class="mt-6 max-w-3xl sm:mt-7" novalidate @submit.prevent="submitSearch">
            <UiLabel for="homepage-part-search" class="sr-only">Search by part number or keyword</UiLabel>
            <div class="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-[0_8px_24px_rgba(2,8,23,0.2)] sm:flex-row">
              <div class="flex min-w-0 flex-1 items-center gap-3 px-3">
                <SearchIcon class="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                <UiInput
                  id="homepage-part-search"
                  ref="searchInput"
                  v-model="searchTerm"
                  type="search"
                  autocomplete="off"
                  placeholder="e.g. STM32F407, 10k resistor, USB-C"
                  class="h-11 min-w-0 flex-1 text-sm text-slate-900 placeholder:text-slate-400 sm:text-base"
                  :aria-invalid="Boolean(searchError)"
                  :aria-describedby="searchError ? 'homepage-search-help homepage-search-error' : 'homepage-search-help'"
                />
              </div>
              <UiButton type="submit" class="min-h-11 gap-2 px-5">
                <SearchIcon class="h-4 w-4" aria-hidden="true" />
                Search catalog
              </UiButton>
            </div>
            <p id="homepage-search-help" class="mt-2 text-xs text-slate-300">Use a manufacturer part number for the most precise match.</p>
            <p v-if="searchError" id="homepage-search-error" class="mt-2 text-sm font-medium text-amber-200" role="alert">
              {{ searchError }}
            </p>
          </form>

          <div class="mt-6 hidden border-t border-white/15 pt-4 sm:mt-8 sm:pt-5 md:mt-10 md:block md:pt-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <span class="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Browse categories</span>
              <nav aria-label="Browse product categories" class="flex flex-wrap gap-2">
                <NuxtLink
                  v-for="category in categoryLinks"
                  :key="category.id"
                  :to="categoryBrowseUrl(category)"
                  class="inline-flex min-h-10 items-center rounded-lg border border-white/20 px-3 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-200/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  {{ category.name }}
                  <span v-if="category.productCount" class="ml-1.5 text-xs text-slate-400">{{
                    category.productCount.toLocaleString()
                  }}</span>
                </NuxtLink>
                <NuxtLink
                  to="/search"
                  class="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-cyan-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  All categories <span aria-hidden="true" class="ml-1">→</span>
                </NuxtLink>
              </nav>
            </div>
          </div>
        </div>
      </div>
      <nav aria-label="Browse product categories" class="mt-5 border-t border-slate-200 pt-4 md:hidden">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Browse categories</p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <NuxtLink
            v-for="category in categoryLinks"
            :key="category.id"
            :to="categoryBrowseUrl(category)"
            class="inline-flex min-h-11 items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {{ category.name }}
            <span v-if="category.productCount" class="ml-2 text-xs font-medium text-slate-500">{{
              category.productCount.toLocaleString()
            }}</span>
          </NuxtLink>
          <NuxtLink
            to="/search"
            class="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            All categories <span aria-hidden="true" class="ml-2">→</span>
          </NuxtLink>
        </div>
      </nav>
      <div
        class="mt-5 grid grid-cols-1 gap-2 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-200 md:mt-5 md:border-t-0 md:pt-0"
      >
        <div class="flex items-center gap-2 px-1 sm:px-4 sm:first:pl-0">
          <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>Sample catalog online</span>
        </div>
        <div class="flex items-center gap-2 px-1 sm:px-4">
          <span class="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
          <span>Stock and manufacturer details</span>
        </div>
        <div class="flex items-center gap-2 px-1 sm:px-4 sm:last:pr-0">
          <span class="h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
          <span>Manufacturer details for every part</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import SearchIcon from '@/assets/icons/search.svg';
import { categoryBrowseUrl } from '~~/helpers/categoryPath.helper';

const router = useRouter();
const { categories, getCategories } = useCategories();
const searchInput = ref<{ el: HTMLInputElement | null } | null>(null);
const searchTerm = ref('');
const searchError = ref('');

type CategoryLink = { id: string; name: string; path: string; productCount?: number };

const fallbackCategories: CategoryLink[] = [
  { id: 'semiconductors', name: 'Semiconductors', path: 'semiconductors' },
  { id: 'passives', name: 'Passives', path: 'passives' },
];

const categoryLinks = computed<CategoryLink[]>(() => {
  const source = categories.value.length
    ? categories.value.filter(
        (category) => ['semiconductors', 'passives'].includes(category.path.split('/')[0] || '') && Number(category.productCount || 0) > 0,
      )
    : fallbackCategories;
  return source.slice(0, 4);
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

onMounted(() => {
  void getCategories();
});
</script>
