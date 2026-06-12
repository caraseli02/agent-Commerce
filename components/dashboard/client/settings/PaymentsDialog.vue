<script setup lang="ts">
import { PlusCircleIcon } from 'lucide-vue-next';

import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import type { StripeCardInterface } from '~/types';

const formSchema = toTypedSchema(
    z.object({
        phoneNumber: z
            .string()
            .min(1, 'Phone Number is required')
            .regex(/^\+?\d{1,4}?\s?-?\(?\d{1,3}?\)?\s?-?\d{1,4}\s?-?\d{1,4}\s?-?\d{1,9}$/, 'Invalid phone number'),
        cardNumber: z.string().min(16, 'Card Number is required').max(16, 'Card Number should be 16 digits'),
        expiryDate: z.string().min(1, 'Expiry Date is required'),
        cvv: z.string().min(3, 'CVV is required').max(4, 'CVV should be 3 or 4 digits'),
    })
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
    }
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
    { immediate: true } // Log immediately on mount if cardInfo is already available
);

const showErrorMsg = ref(true);
</script>

<template>
    <UiDialog v-model:open="localIsOpen">
        <UiDialogTrigger as-child>
            <UiButton class="rounded-full" size="icon" variant="ghost">
                <PlusCircleIcon class="aspect-square w-10 h-10 stroke-1 text-blue-500" />
            </UiButton>
        </UiDialogTrigger>
        <UiDialogContent class="max-w-[350px] sm:max-w-[480px] rounded-xl">
            <UiDialogHeader>
                <UiDialogTitle>Add New Card</UiDialogTitle>
            </UiDialogHeader>
            <PaymentSetupCardForm />
            <!--            <section class="flex flex-col self-stretch bg-white rounded-xl shadow-sm max-md:px-5 max-h-[85vh] overflow-y-auto"> -->
            <!--                <form class="mt-5 flex flex-col gap-y-6 gap-x-9" @submit="onSubmit"> -->
            <!--                    <FormField v-slot="{ componentField }" name="phoneNumber"> -->
            <!--                        <FormItem> -->
            <!--                            <FormLabel>Contact Phone number</FormLabel> -->
            <!--                            <FormControl> -->
            <!--                                <div class="relative"> -->
            <!--                                    <input -->
            <!--                                        v-model="cardFields.phoneNumber" -->
            <!--                                        type="tel" -->
            <!--                                        placeholder="+1 (555) 867-5309" -->
            <!--                                        class="mt-1 block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" -->
            <!--                                        v-bind="componentField" -->
            <!--                                    /> -->
            <!--                                </div> -->
            <!--                            </FormControl> -->
            <!--                            <FormMessage v-if="showErrorMsg" /> -->
            <!--                        </FormItem> -->
            <!--                    </FormField> -->
            <!--                    <FormField v-slot="{ componentField }" name="cardNumber"> -->
            <!--                        <FormItem> -->
            <!--                            <FormLabel>Card Number</FormLabel> -->
            <!--                            <FormControl> -->
            <!--                                <div class="relative"> -->
            <!--                                    <input -->
            <!--                                        v-model="cardFields.cardNumber" -->
            <!--                                        type="text" -->
            <!--                                        placeholder="0000-0000-0000-0000" -->
            <!--                                        class="mt-1 block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" -->
            <!--                                        v-bind="componentField" -->
            <!--                                    /> -->
            <!--                                    <div class="absolute inset-y-0 right-3 pl-3 flex items-center pointer-events-none"> -->
            <!--                                        <CreditCardIcon class="h-5 w-5 text-gray-400" /> -->
            <!--                                    </div> -->
            <!--                                </div> -->
            <!--                            </FormControl> -->
            <!--                            <FormMessage v-if="showErrorMsg" /> -->
            <!--                        </FormItem> -->
            <!--                    </FormField> -->
            <!--                    <div class="flex flex-col md:flex-row gap-4 mb-4"> -->
            <!--                        <FormField v-slot="{ componentField }" name="expiryDate"> -->
            <!--                            <FormItem> -->
            <!--                                <FormLabel>Expiry Date</FormLabel> -->
            <!--                                <FormControl> -->
            <!--                                    <div class="relative"> -->
            <!--                                        <input -->
            <!--                                            v-model="cardFields.expiryDate" -->
            <!--                                            type="text" -->
            <!--                                            placeholder="MM/YY" -->
            <!--                                            class="mt-1 block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" -->
            <!--                                            v-bind="componentField" -->
            <!--                                        /> -->
            <!--                                        <div class="absolute inset-y-0 right-3 pl-3 flex items-center pointer-events-none"> -->
            <!--                                            <CalendarDaysIcon class="h-5 w-5 text-gray-400" /> -->
            <!--                                        </div> -->
            <!--                                    </div> -->
            <!--                                </FormControl> -->
            <!--                                <FormMessage v-if="showErrorMsg" /> -->
            <!--                            </FormItem> -->
            <!--                        </FormField> -->
            <!--                        <FormField v-slot="{ componentField }" name="cvv"> -->
            <!--                            <FormItem> -->
            <!--                                <FormLabel>CVV</FormLabel> -->
            <!--                                <FormControl> -->
            <!--                                    <div class="relative"> -->
            <!--                                        <input -->
            <!--                                            v-model="cardFields.cvv" -->
            <!--                                            type="text" -->
            <!--                                            placeholder="123" -->
            <!--                                            class="mt-1 block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" -->
            <!--                                            v-bind="componentField" -->
            <!--                                        /> -->
            <!--                                        <div class="absolute inset-y-0 right-3 pl-3 flex items-center pointer-events-none"> -->
            <!--                                            <CreditCardIcon class="h-5 w-5 text-gray-400" /> -->
            <!--                                        </div> -->
            <!--                                    </div> -->
            <!--                                </FormControl> -->
            <!--                                <FormMessage v-if="showErrorMsg" /> -->
            <!--                            </FormItem> -->
            <!--                        </FormField> -->
            <!--                    </div> -->
            <!--                    <div class="flex justify-end gap-4 col-span-2 sticky bottom-0 bg-white pt-2"> -->
            <!--                        <UiButton variant="secondary" type="reset" @click="onCloseDialog()"> Cancel</UiButton> -->
            <!--                        <UiButton type="submit" class="w-60"> Continue</UiButton> -->
            <!--                    </div> -->
            <!--                </form> -->
            <!--            </section> -->
        </UiDialogContent>
    </UiDialog>
</template>

<style scoped lang="postcss">
label {
    @apply text-slate-500;
}
</style>
