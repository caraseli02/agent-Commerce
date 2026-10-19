<template>
  <div class="mx-2 flex flex-col gap-4 py-4 md:mx-3 md:items-start md:justify-between md:py-0 xl:mx-3 md:flex-row">
    <!-- Visually hidden on mobile rather than display:none, so the section keeps a
         reachable h2 and the product h3s do not break heading order. -->
    <h2 class="sr-only text-xl font-medium md:not-sr-only md:block">
      {{ sectionHeading }}
    </h2>
    <div
      class="relative flex max-w-full items-center gap-4 overflow-x-auto pb-1 xl:gap-6"
      role="radiogroup"
      aria-label="Featured product collections"
    >
      <p v-for="(filter, index) in filters" :key="index" class="relative overflow-hidden shrink-0">
        <UiButton
          variant="link"
          class="relative h-auto p-0 pb-[13px] text-sm font-medium motion-reduce:transition-none hover:text-blue-700 md:text-base md:pb-3"
          :class="[activeFilter === textUtil.slugify(filter) ? 'text-blue-700' : 'text-slate-500 after:opacity-0']"
          role="radio"
          :aria-checked="activeFilter === textUtil.slugify(filter)"
          :tabindex="activeFilter === textUtil.slugify(filter) ? 0 : -1"
          @click="setActiveFilter(filter)"
          @keydown="onFilterKeydown($event, index)"
        >
          {{ filter }}
        </UiButton>
        <span
          :class="activeFilter === textUtil.slugify(filter) ? 'scale-x-100' : 'scale-x-0'"
          class="absolute bottom-0 left-0 h-[4px] w-full origin-left scale-x-0 bg-blue-700 rounded-full transition-transform duration-300 motion-reduce:transition-none"
        />
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~~/types/product';
import { useProducts } from '~/composables/useProducts';
import { getProductSectionHeading } from '~/utils/productSectionHeadings';

const { loadProductTabProducts } = useProducts();

const props = defineProps<{
  filters: string[];
  initialProducts?: ProductInterface[];
  retryKey?: number;
}>();

const emit = defineEmits<{
  newProducts: [val: ProductInterface[]];
  loadStart: [];
  loadError: [message: string];
}>();

const initialFilter = textUtil.slugify(props.filters[0] ?? '');
const activeFilter = ref(initialFilter);

const sectionHeading = computed(() => getProductSectionHeading(activeFilter.value));

const setActiveFilter = (filter: string) => {
  activeFilter.value = textUtil.slugify(filter);
};

const onFilterKeydown = (event: KeyboardEvent, index: number) => {
  const nextIndex =
    event.key === 'ArrowRight'
      ? (index + 1) % props.filters.length
      : event.key === 'ArrowLeft'
        ? (index - 1 + props.filters.length) % props.filters.length
        : -1;
  if (nextIndex < 0) return;
  event.preventDefault();
  const nextFilter = props.filters[nextIndex];
  if (!nextFilter) return;
  setActiveFilter(nextFilter);
  const buttons = (event.currentTarget as HTMLElement).parentElement?.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
  buttons?.[nextIndex]?.focus();
};

watch(
  [activeFilter, () => props.retryKey ?? 0],
  async ([value, retryKey]) => {
    if (!value) return;

    if (value === initialFilter && props.initialProducts && retryKey === 0) {
      emit('newProducts', props.initialProducts);
      return;
    }

    emit('loadStart');
    try {
      const products = await loadProductTabProducts(value);
      emit('newProducts', products);
    } catch (error) {
      console.error('Failed to load product tab', error);
      emit('loadError', 'We couldn’t load this product collection.');
    }
  },
  { immediate: true },
);
</script>

<style scoped></style>
