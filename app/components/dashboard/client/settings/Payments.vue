<script setup lang="ts">
import CardsList from './CardsList.vue';
import PaymentsDialog from './PaymentsDialog.vue';
import type { StripeCardInterface } from '~~/types';

const isDialogOpen = ref(false);
const selectedCardInfo = ref({} as StripeCardInterface);

const handleEditCard = (cardInfo: StripeCardInterface) => {
  selectedCardInfo.value = cardInfo; // Set the selected card info for the dialog
  isDialogOpen.value = true; // Open the PaymentsDialog
};
</script>

<template>
  <section id="payments" class="flex flex-col gap-9 self-stretch p-4 md:p-6 bg-card rounded-xl shadow-l">
    <div class="flex gap-2.5 justify-between w-full max-md:flex-wrap max-md:max-w-full">
      <h2 class="self-start text-xl font-semibold leading-7 text-foreground">Payments</h2>
    </div>
    <CardsList @edit-card="handleEditCard" />
    <section class="flex justify-center items-center self-stretch p-4 rounded-xl border border-primary border-dashed max-md:px-5">
      <PaymentsDialog v-model="isDialogOpen" :card-info="selectedCardInfo" />
    </section>
  </section>
</template>

<style scoped></style>
