<template>
  <UiDialog :open="isOpen" @update:open="onOpenChange">
    <UiDialogContent>
      <div class="flex items-center justify-between pr-8">
        <div class="flex items-center text-slate-500">
          <TrashIcon class="w-6 h-6 mr-2 shrink-0" />
          <span class="font-medium">{{ resolvedTitle }}</span>
        </div>
      </div>
      <div class="text-sm text-center">{{ resolvedDescription }}</div>
      <div class="flex items-center justify-center gap-2.5">
        <UiButton :disabled="isDeleting || !ids.length" @click="confirmDelete">
          {{ confirmLabel }}
        </UiButton>
        <UiButton variant="outline" :disabled="isDeleting" @click="isOpen = false">
          {{ cancelLabel }}
        </UiButton>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import TrashIcon from '@/assets/icons/trash-can.svg';
import { useCart } from '~/composables/useCart';

const isOpen = defineModel<boolean>();

const props = withDefaults(
  defineProps<{
    /** Prefer this for both single and bulk deletes. */
    productIds?: string[];
    /** Convenience alias for a single-item delete. */
    productId?: string;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    productIds: () => [],
    productId: undefined,
    title: undefined,
    description: undefined,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  }
);

const emits = defineEmits<{
  close: [];
  removed: [];
}>();

const { removeFromCart } = useCart();
const isDeleting = ref(false);

const ids = computed(() => {
  if (props.productIds?.length) {
    return props.productIds;
  }

  return props.productId ? [props.productId] : [];
});

const count = computed(() => ids.value.length);

const resolvedTitle = computed(() => {
  if (props.title) {
    return props.title;
  }

  return count.value > 1 ? 'Delete Items' : 'Delete Item';
});

const resolvedDescription = computed(() => {
  if (props.description) {
    return props.description;
  }

  if (count.value > 1) {
    return `Delete ${count.value} selected items?`;
  }

  return 'Delete selected item?';
});

const onOpenChange = (open: boolean) => {
  if (isDeleting.value && !open) {
    return;
  }

  isOpen.value = open;
};

const confirmDelete = async () => {
  if (!ids.value.length || isDeleting.value) {
    return;
  }

  isDeleting.value = true;

  try {
    const removed = (await removeFromCart({
      products: ids.value,
    })) as { status?: string } | null;

    if (removed?.status === 'success') {
      isOpen.value = false;
      emits('removed');
    }
  } finally {
    isDeleting.value = false;
  }
};

watch(isOpen, (open) => {
  if (!open) {
    emits('close');
  }
});
</script>
