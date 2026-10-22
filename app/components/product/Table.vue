<script setup lang="ts">
import type { ProductFilters, ProductParametricDataFeaturesInterface, SearchDataItems } from '~~/types/product';
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
let latestSimilarSearch = 0;

const visibleFeatures = computed(() => features?.filter((feature) => feature?.FeatureValue !== '') ?? []);
const canShowSimilar = computed(() => !isLoading.value && totalSimilarProducts.value > 0);

// Seed values are bare numbers with the unit in its own field; values that already carry a unit are left alone.
const formatFeatureValue = (feature: ProductParametricDataFeaturesInterface) => {
  const value = String(feature.FeatureValue ?? '');
  const unit = feature.FeatureUnit?.trim();
  return unit && /^[\d.,\-+/\s]+$/.test(value) ? `${value} ${unit}` : value;
};

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

watch(
  features,
  async () => {
    await searchSimilarProducts();
  },
  { deep: true },
);

const searchSimilarProducts = async () => {
  const searchId = ++latestSimilarSearch;
  isLoading.value = true;

  const selectedFeatures = features.filter((item) => item.checked);
  checkedFeatures.value = selectedFeatures;
  const data = await loadSimilarProductsByFeatures(selectedFeatures, 1, 10);

  if (searchId !== latestSimilarSearch) {
    return;
  }

  if (!data) {
    totalSimilarProducts.value = 0;
    similarProducts.value = null;
    similarFilters.value = null;
    isLoading.value = false;
    return;
  }

  totalSimilarProducts.value = !selectedFeatures.length ? 0 : data.items.total_items;
  similarProducts.value = data.items;
  similarFilters.value = data.filters;

  isLoading.value = false;
};

const showSimilarProducts = async () => {
  if (!canShowSimilar.value) {
    return;
  }

  if (!similarProducts.value || !checkedFeatures.value) {
    return;
  }

  // Transfer the complete state before changing routes so Search can hydrate it
  // during setup instead of observing a post-navigation race.
  productStore.setSimilarProducts({
    filtersCount: 0,
    filters: similarFilters.value ?? {},
    items: similarProducts.value,
  });
  productStore.setSimilarProductFeatures(checkedFeatures.value);
  await router.push({
    path: '/search',
    query: { similar: 'true' },
  });
};

const toggleFeature = (item: ProductParametricDataFeaturesInterface) => {
  item.checked = !item.checked;
};

onMounted(() => {
  setFilterLine();
});
</script>

<template>
  <div ref="elDOM" class="max-w-[1392px] mx-auto relative bg-card rounded-xl font-Inter px-4 py-5 shadow-m md:px-5 md:py-5">
    <div class="flex flex-col gap-3 mb-4 border-b border-border md:flex-row md:items-end md:justify-between md:gap-4 md:mb-5">
      <div class="relative flex items-center gap-4 min-w-0">
        <UiButton
          v-for="(filter, index) in filters"
          :key="index"
          type="button"
          variant="link"
          :data-tab="textUtil.slugify(filter)"
          class="relative h-auto p-0 pb-3 text-sm font-semibold tracking-tight md:text-base"
          :class="[activeFilter === textUtil.slugify(filter) ? 'text-primary' : 'text-muted-foreground']"
          @click="setActiveFilter(filter)"
        >
          {{ filter }}
        </UiButton>
        <div
          class="absolute bottom-0 h-[3px] bg-primary rounded-t-sm transition-all duration-300"
          :style="{
            left: filterLineLeftPosition + 'px',
            width: filterLineWidth + 'px',
          }"
        />
      </div>

      <UiButton
        v-if="isLoading || canShowSimilar"
        type="button"
        :disabled="isLoading || !canShowSimilar"
        class="w-fit shrink-0 md:mb-2.5"
        @click="showSimilarProducts"
      >
        <span v-if="isLoading">Loading...</span>
        <span v-else>Show similar products ({{ totalSimilarProducts }})</span>
      </UiButton>
    </div>

    <div class="overflow-x-auto -mx-1 px-1 [&_tr]:border-border">
      <UiTable class="min-w-0 border-collapse text-left">
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Specification</UiTableHead>
            <UiTableHead>Value</UiTableHead>
            <UiTableHead>Find similar</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow
            v-for="(item, index) in visibleFeatures"
            :key="index"
            class="group cursor-pointer text-xs leading-snug font-medium transition-colors duration-200 odd:bg-muted hover:text-primary"
            @click="toggleFeature(item)"
          >
            <UiTableCell class="h-auto w-[9.5rem] py-2 pl-3 pr-3 text-muted-foreground align-middle md:w-44 md:pl-4 md:pr-4">
              {{ item.FeatureName }}
            </UiTableCell>
            <UiTableCell class="h-auto py-2 pl-0 pr-3 text-foreground align-middle break-words">
              {{ formatFeatureValue(item) }}
            </UiTableCell>
            <UiTableCell
              class="h-auto w-24 py-0 pl-0 pr-3 align-middle md:pr-4 [&:has([role=checkbox])]:pr-3 md:[&:has([role=checkbox])]:pr-4"
            >
              <!-- The label keeps the whole 44px cell area toggling the checkbox; @click.stop keeps the row from toggling it again. -->
              <UiLabel class="ml-auto flex min-h-11 min-w-11 cursor-pointer items-center justify-center" @click.stop>
                <UiCheckbox
                  :checked="item.checked"
                  :aria-label="`Include ${item.FeatureName} in similar-product search`"
                  @update:checked="item.checked = $event"
                />
              </UiLabel>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>
  </div>
</template>
