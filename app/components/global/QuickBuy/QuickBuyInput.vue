<script setup lang="ts">
import { Trash2 } from '@lucide/vue';
import type { QuickBuyItem } from '~~/types/product';

const localQuantity = ref(1);

const props = defineProps<QuickBuyItem & { error?: string; canRemove?: boolean }>();
const localCode = ref(props.code);

const emit = defineEmits<{
  updateProduct: [{ index: number; code: string; quantity: number }];
  removeProduct: [index: number];
}>();

const emitUpdate = () => {
  emit('updateProduct', { index: props.index, code: localCode.value, quantity: localQuantity.value });
};

watch(localQuantity, (newQuantity) => {
  if (newQuantity < 1) localQuantity.value = 1;
  emit('updateProduct', { index: props.index, code: localCode.value, quantity: localQuantity.value });
});

watch(
  () => props.code,
  (code) => {
    localCode.value = code;
  },
);

onMounted(() => {
  localQuantity.value = props.quantity;
});
</script>

<template>
  <div class="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-1.5">
    <div class="min-w-0">
      <label :for="`quick-buy-part-${index}`" class="sr-only">Part number {{ index + 1 }}</label>
      <UiInput
        :id="`quick-buy-part-${index}`"
        v-model="localCode"
        type="text"
        placeholder="Manufacturer part number"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `quick-buy-error-${index}` : undefined"
        @input="emitUpdate"
      />
      <p v-if="error" :id="`quick-buy-error-${index}`" class="mt-1 text-xs font-medium text-amber-700" role="alert">{{ error }}</p>
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
