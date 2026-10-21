<template>
  <div class="flex w-full flex-col gap-3">
    <UiButton
      type="button"
      :variant="isSelected ? 'secondary' : 'outline'"
      class="h-auto min-h-[100px] items-stretch self-stretch w-full flex-col whitespace-normal group"
      @click="paymentMethods(cardInfo, $event)"
    >
      <section class="items-center flex justify-between gap-3">
        <SvgoRadioButtonChecked v-if="isSelected" class="w-5 h-5 text-blue-500 group-hover:text-blue-500 transition duration-300" />
        <SvgoRadioButton v-else class="w-5 h-5 my-[3px] text-[#D4D4D4] group-hover:text-foreground transition duration-300 group" />
        <div class="text-foreground text-sm leading-6 self-stretch grow shrink basis-auto">Pay with a new card</div>
      </section>
      <div class="text-muted-foreground text-xs leading-4 whitespace-nowrap self-end">Your card details will be required at checkout</div>
    </UiButton>
    <div v-if="$slots.default" class="self-end"><slot /></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  cardInfo?: unknown;
  isSelected?: boolean;
}>();

const emits = defineEmits(['selectPaymentOption', 'click']);
const paymentMethods = (cardInfo: unknown, event: MouseEvent) => {
  emits('selectPaymentOption', cardInfo);
  emits('click', event);
};
</script>
