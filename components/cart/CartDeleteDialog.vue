<template>
  <UiDialog :open="isOpen" @update:open="isOpen = $event">
    <UiDialogContent>
      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <TrashIcon class="w-6 h-6 mr-2" />
          <span class="font-medium">Delete Item</span>
        </div>
      </div>
      <template v-if="!success">
        <div class="text-sm text-center">Delete selected item?</div>
        <div class="flex items-center justify-center gap-2.5">
          <button class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white" @click="deleteCartItem">Delete</button>
          <button class="flex bg-gray-100 rounded px-[26px] py-[11px] text-sm font-medium text-slate-500" @click="isOpen = false">
            Cancel
          </button>
        </div>
      </template>
      <div v-else class="flex flex-col items-center flex-1 justify-center">
        <div class="text-xl text-center">Deleted</div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import TrashIcon from '@/assets/icons/trash-can.svg';
import { useCart } from '~/composables/useCart';

const isOpen = defineModel<boolean>();

const props = defineProps<{
  productId: string;
  removeOnlyStockQuantity?: boolean;
  removeOnlyBackstockQuantity?: boolean;
}>();

const emits = defineEmits<{
  close: [];
  removed: [];
}>();

const { removeFromCart } = useCart();
const success = ref(false);

const deleteCartItem = async () => {
  const removed = (await removeFromCart({
    products: [props.productId],
    removeOnlyStockQuantity: props.removeOnlyStockQuantity ?? false,
    removeOnlyBackstockQuantity: props.removeOnlyBackstockQuantity ?? false,
  })) as { status?: string };

  if (removed.status === 'success') {
    success.value = true;
    emits('removed');
  }
};

watch(isOpen, (open) => {
  if (!open) {
    success.value = false;
    emits('close');
  }
});
</script>
