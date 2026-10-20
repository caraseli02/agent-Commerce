<template>
  <UiDialog :open="isOpen" @update:open="onOpenChange">
    <UiDialogContent>
      <UiDialogHeader class="space-y-3 pr-8 text-center sm:text-center">
        <div class="flex items-center justify-center gap-2 text-muted-foreground">
          <TrashIcon class="w-6 h-6 shrink-0" aria-hidden="true" />
          <UiDialogTitle class="text-base font-medium leading-none tracking-normal text-muted-foreground">
            {{ resolvedTitle }}
          </UiDialogTitle>
        </div>
        <UiDialogDescription class="text-sm text-center text-foreground dark:text-slate-300">
          {{ resolvedDescription }}
        </UiDialogDescription>
      </UiDialogHeader>
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
import { resolveCartDeleteDescription, resolveCartDeleteProductIds, resolveCartDeleteTitle } from '~/utils/cartDeleteDialog';

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
  },
);

const emits = defineEmits<{
  close: [];
  removed: [];
}>();

const { removeFromCart } = useCart();
const isDeleting = ref(false);

const ids = computed(() =>
  resolveCartDeleteProductIds({
    productIds: props.productIds,
    productId: props.productId,
  }),
);

const resolvedTitle = computed(() =>
  resolveCartDeleteTitle({
    productIds: props.productIds,
    productId: props.productId,
    title: props.title,
  }),
);

const resolvedDescription = computed(() =>
  resolveCartDeleteDescription({
    productIds: props.productIds,
    productId: props.productId,
    description: props.description,
  }),
);

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
