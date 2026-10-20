<template>
  <UiSheet :open="isOpen" @update:open="onOpenChange">
    <UiSheetContent
      side="right"
      hidde-close-button
      overlay-class-name="z-[60] bg-[rgba(47,50,65,0.10)] backdrop-blur-[7.5px]"
      class="z-[60] flex h-full w-full max-w-none flex-col gap-0 overflow-hidden border-none p-0 shadow-none md:w-[440px] sm:max-w-none [&>button.fixed]:hidden"
    >
      <header
        class="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-6"
        :style="{
          boxShadow: '0px 0px 8px 0px rgba(133, 133, 133, 0.25)',
        }"
      >
        <div class="flex min-w-0 items-center gap-2">
          <CartIcon class="h-5 w-5 shrink-0 text-blue-500" aria-hidden="true" />
          <UiSheetTitle class="truncate text-sm font-medium text-blue-500">Shopping Cart</UiSheetTitle>
        </div>
        <UiSheetClose as-child>
          <UiButton
            variant="ghost"
            size="icon"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground transition-colors duration-300 hover:bg-secondary hover:text-blue-500"
            aria-label="Close shopping cart"
          >
            <XIcon class="h-5 w-5" />
          </UiButton>
        </UiSheetClose>
      </header>
      <div class="flex min-h-0 flex-1 flex-col">
        <Cart @close="closeModal" />
      </div>
    </UiSheetContent>
  </UiSheet>
</template>

<script setup lang="ts">
import Cart from './cart/Index.vue';
import XIcon from '@/assets/icons/x.svg';
import CartIcon from '@/assets/icons/cart.svg';

const emit = defineEmits(['close']);
const isOpen = ref(true);

const closeModal = () => {
  isOpen.value = false;
  emit('close');
};

const onOpenChange = (open: boolean) => {
  isOpen.value = open;

  if (!open) {
    emit('close');
  }
};
</script>
