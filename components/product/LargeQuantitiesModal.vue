<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = toTypedSchema(
  z.object({
    quantity: z.number().min(100, 'Quantity must be at least 100'),
    productCode: z.string().min(1, 'Product code is required'),
    email: z.string().email('Invalid email address'),
    details: z.string().optional(),
  }),
);

const { handleSubmit, setFieldValue } = useForm({
  validationSchema: formSchema,
  initialValues: {
    quantity: 100,
  },
});

const onSubmit = handleSubmit((_values) => {
});

const isOpen = defineModel<boolean>();
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="border-none shadow-s max-w-[358px] md:max-w-md rounded-xl">
      <form
        class="flex flex-col gap-4 w-full bg-white shadow-sm"
        @submit="onSubmit"
      >
        <h4
          id="price-enquiry-title"
          class="text-lg font-semibold leading-7 text-gray-800 mb-6"
        >
          Price Enquiry
        </h4>

        <!-- Quantity Field -->
        <FormField
          v-slot="{ value }"
          name="quantity"
        >
          <FormItem class="flex justify-between items-center relative">
            <FormLabel>Quantity</FormLabel>
            <UiNumberField
              class="gap-2"
              :min="100"
              :model-value="value"
              @update:model-value="(v: number) => {
                if (v) {
                  setFieldValue('quantity', v)
                }
                else {
                  setFieldValue('quantity', undefined)
                }
              }"
            >
              <UiNumberFieldContent class="max-w-[150px]">
                <UiNumberFieldDecrement />
                <FormControl>
                  <UiNumberFieldInput />
                </FormControl>
                <UiNumberFieldIncrement />
              </UiNumberFieldContent>
            </UiNumberField>
            <!-- <FormMessage class="absolute right-0 -top-6" /> -->
          </FormItem>
        </FormField>

        <!-- Product Code Field -->
        <FormField
          v-slot="{ componentField }"
          name="productCode"
        >
          <FormItem>
            <FormLabel>Product Code</FormLabel>
            <FormControl>
              <UiInput
                type="text"
                placeholder="Enter product code"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Email Field -->
        <FormField
          v-slot="{ componentField }"
          name="email"
        >
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <UiInput
                type="email"
                placeholder="Enter email address"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Additional Details Field -->
        <FormField
          v-slot="{ componentField }"
          name="details"
        >
          <FormItem>
            <FormLabel>Additional Details (Optional)</FormLabel>
            <FormControl>
              <UiTextarea
                class="min-h-[140px] bg-light-100"
                placeholder="Type your note here..."
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Submit Button -->
        <UiButton
          type="submit"
          class="mt-6 w-full"
        >
          Submit
        </UiButton>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
