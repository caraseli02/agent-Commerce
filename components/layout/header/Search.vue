<template>
  <div class="relative">
    <label
      class="relative hidden border-[1.5px] border-blue-500 rounded-lg items-center h-11 overflow-hidden md:flex"
      :class="[isScrolled ? 'lg:border-border' : '']"
    >
      <SearchIcon v-if="!isScrolled" class="hidden w-4 h-4 flex-shrink-0 text-gray-500 self-center ml-3 md:inline-block" />
      <form action="" class="w-full flex" @submit.prevent>
        <input
          ref="searchDOM"
          v-model="searchVal"
          type="search"
          placeholder="Search products"
          autocomplete="off"
          class="flex-1 text-sm leading-[1.29] text-slate-500 h-11 py-3 w-full placeholder:text-gray-500 focus:outline-none"
          :class="[isScrolled ? 'px-3' : 'px-2']"
          @input="onInput"
          @keypress.enter="handleEnterButton"
          @blur="
            showSearchResults = false;
            $emit('blur');
          "
        />
      </form>
      <div
        v-if="!isScrolled"
        class="flex items-center justify-center bg-blue-500 hover:bg-blue-600 cursor-pointer px-4 py-3"
        @click="handleEnterButton"
      >
        <SearchIcon class="w-5 h-5 text-white" />
      </div>
      <UiButton
        v-else
        size="icon"
        variant="ghost"
        class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer"
        @click="handleEnterButton"
      >
        <SearchIcon class="w-5 h-5 text-gray-500" />
      </UiButton>
    </label>
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
import _ from 'lodash';
import Emitter from 'tiny-emitter/instance';
import SearchIcon from '@/assets/icons/search.svg';
import type { ProductInterface } from '~~/model/products/response/ProductResponse';
import type { SearchData } from '~~/model/products/response/ProductSearchResponse';
import { fetchSearchProduct } from '~/composables/api/products';

const route = useRoute();

const props = defineProps({
  isScrolled: {
    type: Boolean,
    required: false,
  },
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

const searchDOM = ref<HTMLElement>();
const searchVal = ref('');
const isLoading = ref<boolean>(false);
const productList = ref<ProductInterface[]>([]);
const showSearchResults = ref(true);
const category = ref<string | null>(route.query?.category?.toString() || null);

const onInput = _.debounce(async () => {
  productList.value = (await searchProduct(searchVal.value)) || [];
  isLoading.value = false;
}, 200);

const searchProduct = async (keyword: string, page = 1, perPage = 10): Promise<ProductInterface[] | null> => {
  isLoading.value = true;

  const response = (await fetchSearchProduct(keyword, category.value, page, perPage)) as { data?: SearchData };
  const data = response.data;

  if (!data) {
    return null;
  }

  if (!data || !data.items || !data.items.items.length) {
    return null;
  }

  Emitter.emit('product-keyword-change', { keyword: keyword, products: data });

  return data.items.items;
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
      searchDOM.value?.focus();
    });
  }
});
</script>
