<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import type { QuickBuyItem } from '~/types/product';

const localQuantity = ref(1);

const props = defineProps<QuickBuyItem>();
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

onMounted(() => {
  localQuantity.value = props.quantity;
});
</script>

<template>
  <div class="flex w-full items-center gap-1.5">
    <UiInput v-model="localCode" type="text" placeholder="Product Code" @input="emitUpdate" />
    <QuantityButtons v-model="localQuantity" class="w-full" size="lg" />
    <UiButton variant="ghost" size="icon" class="min-w-8 min-h-8" @click="emit('removeProduct', index)">
      <Trash2 class="w-4 h-4" />
    </UiButton>
  </div>
</template>

<style scoped></style>
