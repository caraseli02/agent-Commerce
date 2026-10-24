<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
import { MessageCircleQuestion } from '@lucide/vue';

import { cn } from '@/lib/utils';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';

const formSchema = toTypedSchema(
  z.object({
    email: z.string().trim().min(1, 'Required').email('Invalid email address'),
    details: z.string().optional(),
  }),
);

const props = withDefaults(
  defineProps<{
    showTrigger?: boolean;
    triggerClass?: string;
  }>(),
  {
    showTrigger: true,
    triggerClass: '',
  },
);

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
});

const onSubmit = handleSubmit(() => {
  toast({
    title: 'Enquiry saved for this demo',
    description: 'This portfolio build does not send enquiries to an external service.',
    variant: 'success',
  });
  resetForm();
  isOpen.value = false;
});

const isOpen = ref(false);

defineExpose({
  open: () => {
    isOpen.value = true;
  },
  close: () => {
    isOpen.value = false;
  },
});
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogTrigger v-if="props.showTrigger" as-child>
      <UiButton variant="link" class="text-muted-foreground gap-1" :class="props.triggerClass">
        <MessageCircleQuestion class="w-[22px] h-[22px]" />
        <span class="text-xs leading-tight hidden sm:inline">Ask about the product</span>
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="border-none shadow-s max-w-[358px] md:max-w-md rounded-xl">
      <UiDialogHeader>
        <UiDialogTitle>Ask about the product</UiDialogTitle>
        <UiDialogDescription class="sr-only">Save a sample product enquiry in the portfolio demo.</UiDialogDescription>
      </UiDialogHeader>
      <form class="flex flex-col gap-4 w-full bg-card shadow-sm" @submit="onSubmit">
        <h4 id="price-enquiry-title" class="text-xl text-muted-foreground leading-7 mb-4">
          Part No: <span class="font-medium text-foreground">XOEIJLSCDA</span>
        </h4>

        <!-- Email Field -->
        <FormField v-slot="{ componentField, errorMessage }" name="email">
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <UiInput
                type="email"
                placeholder="Enter email address"
                v-bind="componentField"
                :class="cn(errorMessage ? 'border-red-500 focus-visible:ring-red-500' : '')"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Additional Details Field -->
        <FormField v-slot="{ componentField }" name="details">
          <FormItem>
            <FormLabel>Additional Details (Optional)</FormLabel>
            <FormControl>
              <UiTextarea class="min-h-[140px] bg-muted" placeholder="Type your note here..." v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Submit Button -->
        <UiButton type="submit" class="mt-6 w-full"> Submit </UiButton>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
