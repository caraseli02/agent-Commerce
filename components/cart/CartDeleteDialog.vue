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
          <UiButton @click="deleteCartItem">Delete</UiButton>
          <UiButton variant="outline" @click="isOpen = false">Cancel</UiButton>
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
