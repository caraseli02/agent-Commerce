<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue';

import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import * as z from 'zod';
import { toast } from '@/components/ui/toast';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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

const formSchema = toTypedSchema(
  z.object({
    description: z.string().min(10, {
      message: 'Description must be at least 10 characters.',
    }),
  }),
);

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
});

const onSubmit = handleSubmit(() => {
  toast({
    title: 'Report saved for this demo',
    description: 'This portfolio build does not send reports to an external service.',
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
      <UiButton variant="link" class="gap-1 text-slate-300" :class="props.triggerClass">
        <AlertTriangle class="w-[22px] h-[22px]" />
        <span class="hidden sm:inline">Report an error</span>
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="border-none shadow-s max-w-[358px] md:max-w-md rounded-xl">
      <DialogHeader>
        <DialogTitle class="text-lg font-semibold leading-7 text-foreground mb-10"> Report an error </DialogTitle>
        <DialogDescription class="sr-only"> Report an error </DialogDescription>
      </DialogHeader>
      <form class="w-full space-y-6" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Error description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the issue you encountered"
                class="resize-none min-h-[140px] bg-muted"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <UiButton class="w-full mt-10" type="submit"> Save demo report </UiButton>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
