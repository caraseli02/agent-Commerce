<script setup lang="ts">
import CheckIcon from '@/assets/icons/check.svg';
import type { ProductParametricDataFeaturesInterface } from '~/model/products/response/ProductResponse';
import type { ProductFilters, SearchDataItems } from '~/model/products/response/ProductSearchResponse';
import { fetchSearchProduct } from '~/composables/api/products';
import { useProductStore } from '~/store/productStore';

const router = useRouter();
const productStore = useProductStore();

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

  checkedFeatures.value = features.filter(item => item.checked);
  const { data } = await fetchSearchProduct('', null, 1, 10, {}, {}, checkedFeatures.value);

  totalSimilarProducts.value = !checkedFeatures.value.length ? 0 : data.items.total_items;
  similarProducts.value = data.items;
  similarFilters.value = data.filters;

  isLoading.value = false;
};

const showSimilarProducts = async () => {
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

onMounted(() => {
  setFilterLine();
});
</script>

<template>
  <div
    ref="elDOM"
    class="max-w-[1392px] mx-auto relative bg-white rounded-xl font-Inter pt-7 pb-[25px] shadow-m md:py-[15px]"
  >
    <div
      class="flex flex-col items-center mb-[30px] md:flex-row md:justify-between md:items-end md:mb-10 md:border-b md:border-gray-200 md:px-[15px] lg:px-5"
    >
      <div class="border-b border-gray-200 w-full px-[15px] mb-[30px] md:px-0 md:mb-0 md:border-b-0">
        <div class="relative flex items-center gap-[15px]">
          <button
            v-for="(filter, index) in filters"
            :key="index"
            :data-tab="textUtil.slugify(filter)"
            class="relative font-medium pb-5 transition-colors duration-300 hover:text-blue-500 md:text-base md:pb-4"
            :class="[activeFilter === textUtil.slugify(filter) ? 'text-blue-500' : 'text-slate-500 after:opacity-0']"
            @click="setActiveFilter(filter)"
          >
            {{ filter }}
          </button>
          <div
            class="absolute bottom-0 h-[5px] bg-blue-500 rounded-t-[5px] transition-all duration-300"
            :style="{
              left: filterLineLeftPosition + 'px',
              width: filterLineWidth + 'px',
            }"
          />
        </div>
      </div>
      <button
        :disabled="isLoading"
        class="min-w-[236px] flex bg-slate-500 px-6 py-3 rounded-lg text-sm font-medium text-white flex-shrink-0 md:mb-[15px] w-fit justify-center"
        :class="{ 'bg-gray-400': isLoading }"
        @click="searchSimilarProducts"
      >
        <span v-if="isLoading"> Loading... </span>
        <span
          v-else
          @click="showSimilarProducts()"
        > Show similar products ({{ totalSimilarProducts }}) </span>
      </button>
    </div>
    <div class="mb-[25px]">
      <table class="w-full">
        <tr
          v-for="(item, index) in features?.filter((feature) => feature?.FeatureValue !== '')"
          :key="index"
          class="group w-full text-xs leading-tight font-medium font-Inter text-left cursor-pointer transition-colors duration-300 odd:bg-[#F2F2F2] hover:text-blue-500"
          @click="item.checked = !item.checked"
        >
          <td class="pl-[15px] py-1 lg:pl-5 max-w-36 pr-2">
            {{ item.FeatureName }}
          </td>
          <td class="py-1 max-w-16 truncate">
            {{ item.FeatureValue }}
          </td>
          <td class="flex justify-end pr-[15px] py-1 lg:pr-5">
            <div
              class="flex items-center justify-center w-[18px] h-[18px] rounded border transition-colors duration-300"
              :class="[item.checked ? 'bg-blue-500 border-blue-500' : 'border-border group-hover:border-gray-300']"
            >
              <CheckIcon
                v-if="item.checked"
                class="w-4 text-white"
              />
            </div>
          </td>
        </tr>
      </table>
    </div>
    <div class="flex justify-center px-[15px] md:justify-end lg:px-5">
      <button
        :disabled="isLoading"
        class="min-w-[236px] flex bg-slate-500 px-6 py-3 rounded-lg text-sm font-medium text-white flex-shrink-0 md:mb-[15px] justify-center"
        :class="{ 'bg-gray-400': isLoading }"
        @click="searchSimilarProducts"
      >
        <span v-if="isLoading"> Loading... </span>
        <span
          v-else
          @click="showSimilarProducts()"
        > Show similar products ({{ totalSimilarProducts }}) </span>
      </button>
    </div>
  </div>
</template>
