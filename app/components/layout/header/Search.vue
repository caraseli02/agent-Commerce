<template>
  <div class="relative rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
    <UiLabel class="relative hidden h-11 items-center overflow-hidden rounded-lg border border-border bg-card font-normal md:flex">
      <form action="" class="flex h-full min-w-0 flex-1 items-center" @submit.prevent>
        <UiInput
          ref="searchDOM"
          v-model="searchVal"
          type="search"
          placeholder="Search products"
          aria-label="Search products"
          autocomplete="off"
          class="h-full w-full flex-1 rounded-none border-0 px-3 text-sm leading-5 text-muted-foreground placeholder:text-muted-foreground focus:outline-none"
          @input="handleInput"
          @keypress.enter="handleEnterButton"
          @blur="
            showSearchResults = false;
            $emit('blur');
          "
        />
      </form>
      <UiButton type="button" variant="input-addon" size="addon" aria-label="Search" @click="handleEnterButton">
        <SearchIcon class="h-5 w-5 text-primary-foreground" aria-hidden="true" />
      </UiButton>
    </UiLabel>
    <Transition name="fade">
      <LayoutHeaderSearchResults
        v-if="searchVal && showResults && showSearchResults"
        :products="productList"
        :keyword="searchVal"
        :is-loading="isLoading"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import SearchIcon from '@/assets/icons/search.svg';
import type { ProductInterface } from '~~/types/product';
import { useProducts } from '~/composables/useProducts';
import { useProductStore } from '~/store/productStore';

const route = useRoute();
const { searchHeaderResults } = useProducts();
const productStore = useProductStore();

const props = defineProps({
  showResults: {
    type: Boolean,
    required: false,
  },
  isVisible: {
    type: Boolean,
    required: false,
  },
});

defineEmits(['blur']);

const searchDOM = ref<{ el: HTMLInputElement | null } | null>(null);
// Seeded from the URL so /search?keyword=… shows the query it is answering.
const searchVal = ref(route.query?.keyword?.toString() || '');
const isLoading = ref<boolean>(false);
const productList = ref<ProductInterface[]>([]);
// Results open only when the visitor types, so a query prefilled from the URL does not pop up an empty list.
const showSearchResults = ref(false);
const category = ref<string | null>(route.query?.category?.toString() || null);

const onInput = _debounce(async () => {
  productList.value = (await searchProduct(searchVal.value)) || [];
  isLoading.value = false;
}, 200);

const handleInput = () => {
  showSearchResults.value = true;
  onInput();
};

const searchProduct = async (keyword: string, page = 1, perPage = 10): Promise<ProductInterface[] | null> => {
  isLoading.value = true;

  const result = await searchHeaderResults(keyword, category.value, page, perPage);

  if (!result) {
    isLoading.value = false;
    return null;
  }

  productStore.setHeaderSearch(keyword);

  isLoading.value = false;
  return result.items;
};

function handleEnterButton() {
  const router = useRouter();
  router.push({ path: '/search', query: { keyword: searchVal.value } });
}

const focus = computed(() => props.isVisible);

watch(searchVal, (val) => {
  if (!val) showSearchResults.value = false;
});

// Client-side navigation (for example the home search form) changes the query without remounting the header.
watch(
  () => route.query.keyword,
  (keyword) => {
    searchVal.value = keyword?.toString() || '';
  },
);

watch(focus, (newVal) => {
  if (newVal && window.innerWidth >= 768 && window.innerWidth <= 1024) {
    nextTick(() => {
      searchDOM.value?.el?.focus();
    });
  }
});
</script>
