<script setup lang="ts">
import { PlusCircleIcon } from '@lucide/vue';

import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import type { StripeCardInterface } from '~~/types';

const formSchema = toTypedSchema(
  z.object({
    phoneNumber: z
      .string()
      .min(1, 'Phone Number is required')
      .regex(/^\+?\d{1,4}?\s?-?\(?\d{1,3}?\)?\s?-?\d{1,4}\s?-?\d{1,4}\s?-?\d{1,9}$/, 'Invalid phone number'),
    cardNumber: z.string().min(16, 'Card Number is required').max(16, 'Card Number should be 16 digits'),
    expiryDate: z.string().min(1, 'Expiry Date is required'),
    cvv: z.string().min(3, 'CVV is required').max(4, 'CVV should be 3 or 4 digits'),
  }),
);

const { handleSubmit } = useForm({
  validationSchema: formSchema,
  validateOnMount: true,
});

handleSubmit((_values) => {
  showErrorMsg.value = true;
});

const cardFields = ref({
  phoneNumber: '',
  cardNumber: '',
  expiryDate: '',
  cvv: '',
});

const props = defineProps<{
  cardInfo: StripeCardInterface;
}>();

defineEmits(['update:isOpen']);

const localIsOpen = defineModel<boolean>();

watch(
  () => localIsOpen,
  () => {
    cardFields.value.cardNumber = '';
    cardFields.value.phoneNumber = '  ';
    cardFields.value.expiryDate = '';
    cardFields.value.cvv = '';
  },
);

watch(
  () => props.cardInfo,
  (newCardInfo) => {
    cardFields.value.cardNumber = '';
    cardFields.value.phoneNumber = newCardInfo?.billing_details?.phone || '';
    cardFields.value.expiryDate =
      (newCardInfo?.card?.exp_month < 10 ? '0' + newCardInfo?.card?.exp_month : newCardInfo?.card?.exp_month) +
      '/' +
      String(newCardInfo?.card?.exp_year).slice(-2);
    cardFields.value.cvv = '';
  },
  { immediate: true }, // Log immediately on mount if cardInfo is already available
);

const showErrorMsg = ref(true);
</script>

<template>
  <UiDialog v-model:open="localIsOpen">
    <UiDialogTrigger as-child>
      <UiButton class="rounded-full" size="icon" variant="ghost" aria-label="Add new card">
        <PlusCircleIcon class="aspect-square w-10 h-10 stroke-1 text-blue-500" />
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="max-w-[350px] sm:max-w-[480px] rounded-xl">
      <UiDialogHeader>
        <UiDialogTitle>Add New Card</UiDialogTitle>
      </UiDialogHeader>
      <PaymentSetupCardForm />
    </UiDialogContent>
  </UiDialog>
</template>

<style scoped>
@reference "../../../../assets/css/main.css";
label {
  @apply text-muted-foreground;
}
</style>
