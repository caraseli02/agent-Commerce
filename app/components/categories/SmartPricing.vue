<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    entryPrice?: string;
    quantity?: string;
    margin?: string;
    enabled?: boolean;
  }>(),
  {
    entryPrice: '',
    quantity: '',
    margin: '',
    enabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:entry-price', value: string): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'update:quantity', value: string): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'update:margin', value: string): void;
  (e: 'update:enabled', value: boolean): void;
}>();

const smartPricing = ref(props.enabled);
const selectedQuantityLength = ref<number | null>(null);

const handleEntryPriceUpdate = (value: string) => emit('update:entry-price', value);
const handleQuantityUpdate = (value: string) => emit('update:quantity', value);
const handleMarginUpdate = (value: string) => emit('update:margin', value);

const filterMarginLength = computed(() => selectedQuantityLength.value);

const handleQuantitySelectionChange = (length: number | null) => {
  selectedQuantityLength.value = length;
};

watch(
  () => smartPricing.value,
  (value) => {
    if (!value) {
      selectedQuantityLength.value = null;
    }
    emit('update:enabled', value);
  },
  { immediate: true },
);
</script>

<template>
  <section>
    <div class="flex items-center justify-between space-x-2 mb-6">
      <UiLabel for="smart-pricing"> Smart Pricing </UiLabel>
      <UiSwitch id="smart-pricing" v-model:checked="smartPricing" />
    </div>
    <div v-if="smartPricing">
      <CategoriesSelectEntryPrice title="Entry Price" :entry-price="props.entryPrice" @update:entry-price="handleEntryPriceUpdate" />
      <CategoriesSelectQuantity
        title="Quantity"
        :quantity="props.quantity"
        @update:selection-length="handleQuantitySelectionChange"
        @update:quantity="handleQuantityUpdate"
      />
      <CategoriesSelectMargin
        title="Margin"
        :filter-length="filterMarginLength"
        :margin="props.margin"
        @update:margin="handleMarginUpdate"
      />
    </div>
  </section>
</template>
