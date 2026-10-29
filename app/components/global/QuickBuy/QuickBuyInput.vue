<script setup lang="ts">
import { Trash2 } from '@lucide/vue';
import type { QuickBuyItem } from '~~/types/product';

const props = defineProps<QuickBuyItem & { error?: string; canRemove?: boolean }>();
const localCode = ref(props.code);
const localQuantity = ref(props.quantity);
// Inline and dialog rows render side by side, so IDs come from useId rather than the row index (#700).
const inputId = useId();
const errorId = useId();

const emit = defineEmits<{
  updateProduct: [{ index: number; code: string; quantity: number }];
  removeProduct: [index: number];
}>();

const emitUpdate = () => {
  emit('updateProduct', { index: props.index, code: localCode.value, quantity: localQuantity.value });
};

watch(localQuantity, (newQuantity) => {
  if (newQuantity < 1) {
    localQuantity.value = 1;
    return;
  }
  // Only shopper changes write back; a sync from the prop must not re-emit a stale code (#792).
  if (newQuantity !== props.quantity) {
    emit('updateProduct', { index: props.index, code: props.code, quantity: newQuantity });
  }
});

// Rows are keyed by index, so removing a row hands this component the next row's values (#792).
watch(
  () => props.code,
  (code) => {
    localCode.value = code;
  },
);

watch(
  () => props.quantity,
  (quantity) => {
    localQuantity.value = quantity;
  },
);
</script>

<template>
  <div class="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-1.5">
    <div class="min-w-0">
      <UiLabel :for="inputId" class="sr-only">Part number {{ index + 1 }}</UiLabel>
      <UiInput
        :id="inputId"
        v-model="localCode"
        type="text"
        placeholder="Manufacturer part number"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? errorId : undefined"
        @input="emitUpdate"
      />
      <p v-if="error" :id="errorId" class="mt-1 text-xs font-medium text-amber-700" role="alert">{{ error }}</p>
    </div>
    <div aria-label="Quantity">
      <QuantityButtons v-model="localQuantity" size="lg" />
    </div>
    <UiButton
      variant="ghost"
      size="icon"
      class="min-h-11 min-w-11"
      :disabled="canRemove === false"
      :aria-label="`Remove part ${index + 1}`"
      @click="emit('removeProduct', index)"
    >
      <Trash2 class="w-4 h-4" />
    </UiButton>
  </div>
</template>

<style scoped></style>
