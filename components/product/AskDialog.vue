<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
import { MessageCircleQuestion } from 'lucide-vue-next';

import { cn } from '@/lib/utils';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = toTypedSchema(
  z.object({
    email: z.string().trim().min(1, 'Required').email('Invalid email address'),
    details: z.string().optional(),
  })
);

const props = withDefaults(
  defineProps<{
    showTrigger?: boolean;
    triggerClass?: string;
  }>(),
  {
    showTrigger: true,
    triggerClass: '',
  }
);

const { handleSubmit } = useForm({
  validationSchema: formSchema,
});

const onSubmit = handleSubmit((_values) => {});

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
    <UiDialogTrigger v-if="props.showTrigger">
      <UiButton variant="link" class="text-slate-300 gap-1" :class="props.triggerClass">
        <MessageCircleQuestion class="w-[22px] h-[22px]" />
        <span class="text-xs leading-tight hidden sm:inline">Ask about the product</span>
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="border-none shadow-s max-w-[358px] md:max-w-md rounded-xl">
      <p>Ask about the product</p>
      <form class="flex flex-col gap-4 w-full bg-white shadow-sm" @submit="onSubmit">
        <h4 id="price-enquiry-title" class="text-xl text-slate-500 leading-7 mb-4">
          Part No: <span class="font-medium text-neutral-700">XOEIJLSCDA</span>
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
              <UiTextarea class="min-h-[140px] bg-light-100" placeholder="Type your note here..." v-bind="componentField" />
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
