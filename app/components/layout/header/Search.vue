<template>
  <div class="relative">
    <UiLabel class="relative hidden h-11 items-center overflow-hidden rounded-lg border border-border bg-card font-normal md:flex">
      <form action="" class="flex h-full min-w-0 flex-1 items-center" @submit.prevent>
        <UiInput
          ref="searchDOM"
          v-model="searchVal"
          type="search"
          placeholder="Search products"
          autocomplete="off"
          class="h-full w-full flex-1 rounded-none border-0 px-3 text-sm leading-5 text-muted-foreground placeholder:text-muted-foreground focus:outline-none"
          @input="onInput"
          @keypress.enter="handleEnterButton"
          @blur="
            showSearchResults = false;
            $emit('blur');
          "
        />
      </form>
      <div
        class="flex h-full cursor-pointer items-center justify-center bg-primary px-4 transition-colors hover:bg-primary/90"
        @click="handleEnterButton"
      >
        <SearchIcon class="h-5 w-5 text-primary-foreground" />
      </div>
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
import Emitter from 'tiny-emitter/instance';
import SearchIcon from '@/assets/icons/search.svg';
import type { ProductInterface } from '~~/types/product';
import { useProducts } from '~/composables/useProducts';

const route = useRoute();
const { searchHeaderResults } = useProducts();

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
const searchVal = ref('');
const isLoading = ref<boolean>(false);
const productList = ref<ProductInterface[]>([]);
const showSearchResults = ref(true);
const category = ref<string | null>(route.query?.category?.toString() || null);

const onInput = _debounce(async () => {
  productList.value = (await searchProduct(searchVal.value)) || [];
  isLoading.value = false;
}, 200);

const searchProduct = async (keyword: string, page = 1, perPage = 10): Promise<ProductInterface[] | null> => {
  isLoading.value = true;

  const result = await searchHeaderResults(keyword, category.value, page, perPage);

  if (!result) {
    isLoading.value = false;
    return null;
  }

  Emitter.emit('product-keyword-change', { keyword, products: result.searchData });

  isLoading.value = false;
  return result.items;
};

function handleEnterButton() {
  const router = useRouter();
  router.push({ path: '/search', query: { keyword: searchVal.value } });
}

const focus = computed(() => props.isVisible);

watch(searchVal, (val) => {
  if (val) {
    showSearchResults.value = true;
  } else {
    showSearchResults.value = false;
  }
});

watch(focus, (newVal) => {
  if (newVal && window.innerWidth >= 768 && window.innerWidth <= 1024) {
    nextTick(() => {
      searchDOM.value?.el?.focus();
    });
  }
});
</script>
