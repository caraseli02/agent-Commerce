<script setup lang="ts">
import CheckIcon from '@/assets/icons/check.svg';
import type { ProductFilters, ProductParametricDataFeaturesInterface, SearchDataItems } from '~/types/product';
import { useProducts } from '~/composables/useProducts';
import { useProductStore } from '~/store/productStore';

const router = useRouter();
const productStore = useProductStore();
const { loadSimilarProductsByFeatures } = useProducts();

const elDOM = ref<HTMLElement | null>(null);
const isLoading = ref<boolean>(false);

const filters = ref(['Specifications']);
const activeFilter = ref('specifications');
const filterLineLeftPosition = ref(0);
const filterLineWidth = ref(0);
const checkedFeatures = ref([] as ProductParametricDataFeaturesInterface[]);

const props = defineProps<{
  features: ProductParametricDataFeaturesInterface[];
}>();

const features = reactive<ProductParametricDataFeaturesInterface[]>(
  props.features?.map((item) => {
    item.checked = false;
    return item;
  }),
);

const totalSimilarProducts = ref<number>(0);
const similarProducts = ref<SearchDataItems | null>(null);
const similarFilters = ref<ProductFilters | null>(null);

const visibleFeatures = computed(() => features?.filter((feature) => feature?.FeatureValue !== '') ?? []);
const canShowSimilar = computed(() => !isLoading.value && totalSimilarProducts.value > 0);

const setFilterLine = () => {
  if (elDOM.value) {
    const activeFilterEl = elDOM.value.querySelector(`[data-tab=${activeFilter.value}]`) as HTMLButtonElement;

    if (activeFilterEl) {
      const rect = activeFilterEl.getBoundingClientRect();
      filterLineLeftPosition.value = activeFilterEl.offsetLeft;
      filterLineWidth.value = rect.width;
    }
  }
};

const setActiveFilter = (filter: string) => {
  activeFilter.value = textUtil.slugify(filter);
  setFilterLine();
};

watch(features, async () => {
  await searchSimilarProducts();
});

const searchSimilarProducts = async () => {
  isLoading.value = true;

  checkedFeatures.value = features.filter((item) => item.checked);
  const data = await loadSimilarProductsByFeatures(checkedFeatures.value, 1, 10);

  if (!data) {
    totalSimilarProducts.value = 0;
    similarProducts.value = null;
    similarFilters.value = null;
    isLoading.value = false;
    return;
  }

  totalSimilarProducts.value = !checkedFeatures.value.length ? 0 : data.items.total_items;
  similarProducts.value = data.items;
  similarFilters.value = data.filters;

  isLoading.value = false;
};

const showSimilarProducts = async () => {
  if (!canShowSimilar.value) {
    return;
  }

  productStore.showSimilarOnly = true;
  await router.push({
    path: '/search',
    query: { similar: 'true' },
  });

  if (!similarProducts.value || !checkedFeatures.value) {
    return;
  }

  productStore.setSimilarProducts({
    filtersCount: 0,
    filters: similarFilters.value ?? {},
    items: similarProducts.value,
  });
  productStore.setSimilarProductFeatures(checkedFeatures.value);
};

const toggleFeature = (item: ProductParametricDataFeaturesInterface) => {
  item.checked = !item.checked;
};

onMounted(() => {
  setFilterLine();
});
</script>

<template>
  <div ref="elDOM" class="max-w-[1392px] mx-auto relative bg-white rounded-xl font-Inter px-4 py-5 shadow-m md:px-5 md:py-5">
    <div class="flex flex-col gap-3 mb-4 border-b border-gray-200 md:flex-row md:items-end md:justify-between md:gap-4 md:mb-5">
      <div class="relative flex items-center gap-4 min-w-0">
        <button
          v-for="(filter, index) in filters"
          :key="index"
          type="button"
          :data-tab="textUtil.slugify(filter)"
          class="relative text-sm font-semibold tracking-tight pb-3 transition-colors duration-300 hover:text-blue-500 md:text-base"
          :class="[activeFilter === textUtil.slugify(filter) ? 'text-blue-500' : 'text-slate-500']"
          @click="setActiveFilter(filter)"
        >
          {{ filter }}
        </button>
        <div
          class="absolute bottom-0 h-[3px] bg-blue-500 rounded-t-sm transition-all duration-300"
          :style="{
            left: filterLineLeftPosition + 'px',
            width: filterLineWidth + 'px',
          }"
        />
      </div>

      <button
        v-if="isLoading || canShowSimilar"
        type="button"
        :disabled="isLoading || !canShowSimilar"
        class="inline-flex w-fit shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 md:mb-2.5"
        :class="isLoading || !canShowSimilar ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-500 hover:bg-slate-600'"
        @click="showSimilarProducts"
      >
        <span v-if="isLoading">Loading...</span>
        <span v-else>Show similar products ({{ totalSimilarProducts }})</span>
      </button>
    </div>

    <div class="overflow-x-auto -mx-1 px-1">
      <table class="w-full border-collapse text-left">
        <tbody>
          <tr
            v-for="(item, index) in visibleFeatures"
            :key="index"
            class="group cursor-pointer text-xs leading-snug font-medium transition-colors duration-200 odd:bg-[#F2F2F2] hover:text-blue-500"
            @click="toggleFeature(item)"
          >
            <td class="w-[9.5rem] py-2 pl-3 pr-3 text-slate-600 align-middle md:w-44 md:pl-4 md:pr-4">
              {{ item.FeatureName }}
            </td>
            <td class="py-2 pr-3 text-slate-900 align-middle break-words">
              {{ item.FeatureValue }}
            </td>
            <td class="w-10 py-0 pr-3 align-middle md:pr-4">
              <label class="ml-auto flex min-h-11 min-w-11 cursor-pointer items-center justify-center" @click.stop>
                <input
                  v-model="item.checked"
                  type="checkbox"
                  class="peer sr-only"
                  :aria-label="`Include ${item.FeatureName} in similar-product search`"
                />
                <span
                  class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-border transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 group-hover:border-gray-300 peer-checked:border-blue-500 peer-checked:bg-blue-500"
                  aria-hidden="true"
                >
                  <CheckIcon v-if="item.checked" class="w-4 text-white" />
                </span>
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
