<template>
  <button
    class="min-h-[100px] items-stretch self-stretch border hover:border-blue-500 flex w-full flex-col px-3 py-2 rounded-lg border-dashed group"
    :class="isSelected ? 'border-blue-500' : 'border-border'"
    @click="paymentMethods(cardInfo)"
  >
    <section class="items-center flex justify-between gap-3">
      <SvgoRadioButtonChecked v-if="isSelected" class="w-5 h-5 text-blue-500 group-hover:text-blue-500 transition duration-300" />
      <SvgoRadioButton v-else class="w-5 h-5 my-[3px] text-[#D4D4D4] group-hover:text-foreground transition duration-300 group" />
      <div class="text-foreground text-sm leading-6 self-stretch grow shrink basis-auto">Pay with a new card</div>
    </section>
    <div class="text-muted-foreground text-xs leading-4 whitespace-nowrap self-end">Your card details will be required at checkout</div>
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  cardInfo?: unknown;
  isSelected?: boolean;
}>();

const emits = defineEmits(['selectPaymentOption']);
const paymentMethods = async (cardInfo: unknown) => {
  emits('selectPaymentOption', cardInfo);
};
</script>
