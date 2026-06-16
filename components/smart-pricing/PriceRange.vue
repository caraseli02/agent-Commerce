<template>
  <section class="flex gap-4 items-end whitespace-nowrap">
    <div class="flex flex-col flex-1 shrink w-full basis-0 min-w-[240px]">
      <div class="flex items-center gap-3 w-full">
        <div
          class="flex overflow-hidden flex-1 shrink gap-2 items-center pr-3 h-full bg-white rounded-lg border border-solid basis-0 border-grey-300"
        >
          <span
            class="overflow-hidden self-stretch px-3 py-2 my-auto min-w-11 h-11 text-xl leading-snug text-center border-r border-solid bg-stone-50 border-r-grey-300 text-zinc-800"
          >
            $
          </span>
          <label
            for="minPrice"
            class="sr-only"
          >Minimum Price</label>
          <input
            id="minPrice"
            v-model="minPrice"
            type="number"
            class="self-stretch my-auto text-sm leading-none text-neutral-400 w-full bg-transparent border-none focus:outline-none"
            placeholder="Min"
            aria-label="Minimum Price"
            @input="updateRange"
          >
        </div>
        <span class="text-sm leading-none text-zinc-800">-</span>
        <div
          class="flex overflow-hidden flex-1 shrink gap-2 items-center pr-3 h-full bg-white rounded-lg border border-solid basis-0 border-grey-300"
        >
          <span
            class="overflow-hidden self-stretch px-3 py-2 my-auto min-w-11 h-11 text-xl leading-snug text-center border-r border-solid bg-stone-50 border-r-grey-300 text-zinc-800"
          >
            $
          </span>
          <label
            for="maxPrice"
            class="sr-only"
          >Maximum Price</label>
          <input
            id="maxPrice"
            v-model="maxPrice"
            type="number"
            class="self-stretch my-auto text-sm leading-none text-neutral-400 w-full bg-transparent border-none focus:outline-none"
            placeholder="Max"
            aria-label="Maximum Price"
            @input="updateRange"
          >
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePricingStore } from '~/store/pricingStore';

const pricingStore = usePricingStore();
const { editEntryPriceModal } = storeToRefs(pricingStore);

const emit = defineEmits<{
  (e: 'update:priceRange', priceRange: { min: number | null; max: number | null; label: string | null }): void;
}>();

const minPrice = ref<number | null>(null);
const maxPrice = ref<number | null>(null);
const label = ref<string>('');

// Set initial values based on `editEntryPriceModal`
watch(
  () => editEntryPriceModal.value,
  (newRange) => {
    if (newRange) {
      pricingStore.type = 'edit';
      minPrice.value = newRange?.range?.min ?? null;
      maxPrice.value = newRange?.range?.max ?? null;
      label.value = newRange?.label ?? '';
    }
    else {
      pricingStore.type = 'add';
    }
  },
  { immediate: true }, // Initialize immediately when the component loads
);

function updateRange() {
  emit('update:priceRange', { min: minPrice.value, max: maxPrice.value, label: label.value });
}

// Watch minPrice and maxPrice for changes and emit updated range
watch([minPrice, maxPrice, label], ([newMin, newMax, newLabel]) => {
  emit('update:priceRange', { min: newMin, max: newMax, label: newLabel });
});
</script>
