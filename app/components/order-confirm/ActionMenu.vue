<script setup lang="ts">
import { DotsVerticalIcon } from '@radix-icons/vue';
import { CalendarDays, CheckCircle, MapPin, PackageCheck } from '@lucide/vue';

import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import UiSelectContent from '~/components/ui/select/SelectContent.vue';
import { toast } from '~/components/ui/toast';
import { OrderStatus, PaymentStatusEnum, PaymentTypeEnum, type MarkAsPaidRequestInterface, type OrderInterface } from '~~/types';
import { cancelOrder as cancelOrderApi, changeStatus as changeStatusApi, markAsPaid as markAsPaidApi } from '~/composables/api/orders';

// Define props to initialize the form values
const props = defineProps<{
  initialAmountPaid?: number;
  initialCurrency?: string;
  initialDop?: Date | null;
  initialReference?: string;
  initialComments?: string;
  order: OrderInterface;
}>();

const markAsPaid = async (payload: MarkAsPaidRequestInterface) => {
  const response = (await markAsPaidApi(props.order?._id, payload)) as {
    status: string;
    description: string;
  };

  if (response.status !== 'success') {
    toast({
      title: 'Error',
      description: response.description || 'Failed to mark order as paid',
      variant: 'destructive',
    });
    return;
  }

  toast({
    title: 'Success',
    description: 'Order marked as paid successfully',
    variant: 'success',
  });
  return;
};

const statusChangeErrorDescription = (description?: string) =>
  description?.trim() || 'Could not change the order status. Please try again, or refresh the page if it still fails.';

const changeStatus = async (status: OrderStatus) => {
  try {
    const response = await changeStatusApi(props.order?._id, status);

    if (response.status !== 'success') {
      toast({
        title: 'Error',
        description: statusChangeErrorDescription(response.description),
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Order markes as paid',
      variant: 'success',
    });
  } catch {
    toast({
      title: 'Error',
      description: statusChangeErrorDescription(),
      variant: 'destructive',
    });
  }
};

const cancelOrder = async () => {
  const response = (await cancelOrderApi(props.order?._id)) as { status: string; description: string };

  if (response.status !== 'success') {
    toast({
      title: 'Error',
      description: response.description || 'Failed to cancel order',
      variant: 'destructive',
    });
    return;
  }

  toast({
    title: 'Success',
    description: 'Order cancelled successfully',
    variant: 'success',
  });

  return;
};

// Schema for validation
const formSchema = toTypedSchema(
  z.object({
    amountPaid: z.number().min(0, 'Amount must be a positive number'),
    currency: z.string().nonempty('Currency is required'),
    dop: z.date({
      required_error: 'Payment date is required',
    }),
    reference: z.string().optional(),
    comments: z.string().optional(),
  }),
);

// Use Vee-Validate form composable
const { handleSubmit, resetForm, isFieldDirty } = useForm({
  validationSchema: formSchema,
  initialValues: {
    amountPaid: Number(props.initialAmountPaid?.toFixed(2)) || 0,
    currency: props.initialCurrency || 'usd',
    dop: props.initialDop || new Date(),
    reference: props.initialReference || '',
    comments: props.initialComments || '',
  },
});

const isOpen = ref(false);

const emit = defineEmits(['close', 'submit', 'showTrackingDialog']);

// Submit handler
const onSubmit = handleSubmit(async (values) => {
  // Emit the form values to the parent component
  emit('submit', values);

  const payload: MarkAsPaidRequestInterface = {
    amountPaid: values.amountPaid,
    currency: values.currency,
    date: values.dop,
    reference: values.reference,
    comments: values.comments,
  };

  await markAsPaid(payload);

  // Reset the form and close the dialog
  resetForm();
  isOpen.value = false;
});
</script>

<template>
  <UiPopover>
    <UiPopoverTrigger>
      <UiButton
        variant="ghost"
        size="icon"
        class="flex overflow-hidden justify-center items-center self-stretch p-1 my-auto w-8 h-8 rounded-md bg-muted"
        aria-label="Additional options"
      >
        <DotsVerticalIcon alt="" class="object-contain self-stretch my-auto w-6 aspect-square" />
      </UiButton>
    </UiPopoverTrigger>
    <UiPopoverContent class="w-fit flex flex-col gap-2 p-2 border-none" align="end">
      <UiButton
        :disabled="props.order?.status === OrderStatus.Completed || props.order?.status === OrderStatus.Canceled"
        class="hover:text-blue-500 hover:bg-accent justify-start gap-2 min-w-[164px]"
        variant="ghost"
        size="sm"
        @click="changeStatus(OrderStatus.Dispatched)"
      >
        <PackageCheck class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" aria-hidden="true" />
        Fulfill Order
      </UiButton>
      <UiButton
        :disabled="
          props.order?.status === OrderStatus.Completed ||
          props.order?.status === OrderStatus.Canceled ||
          props.order?.paymentDetails?.status === PaymentStatusEnum.Paid
        "
        class="hover:text-blue-500 hover:bg-accent justify-start gap-2 min-w-[164px]"
        variant="ghost"
        size="sm"
        @click="cancelOrder()"
      >
        <PackageCheck class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" aria-hidden="true" />
        Cancel Order
      </UiButton>
      <UiButton
        class="hover:text-blue-500 hover:bg-accent justify-start gap-2 min-w-[164px]"
        variant="ghost"
        size="sm"
        :disabled="
          props.order?.status === OrderStatus.Canceled ||
          props.order.paymentDetails?.type !== PaymentTypeEnum.Bank ||
          props.order.paymentDetails?.status === PaymentStatusEnum.Paid
        "
        @click="isOpen = true"
      >
        <CheckCircle class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
        Mark as Paid
      </UiButton>
      <UiButton
        class="hover:text-blue-500 hover:bg-accent justify-start gap-2 min-w-[164px]"
        variant="ghost"
        size="sm"
        @click="emit('showTrackingDialog')"
      >
        <MapPin class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
        Track Order
      </UiButton>
    </UiPopoverContent>
  </UiPopover>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="border-none shadow-s rounded-xl max-w-[358px] md:max-w-[480px]">
      <section data-layername="property1Desktop" class="flex flex-col gap-10 bg-card rounded-xl shadow-sm max-w-[480px]">
        <header class="flex gap-10 justify-between items-center w-full">
          <h2 data-layername="markAsPaid" class="self-stretch my-auto text-base font-semibold leading-7 text-foreground">Mark as Paid</h2>
        </header>
        <form class="flex flex-col gap-4 w-full text-sm" @submit="onSubmit">
          <div class="flex gap-3 items-start w-full">
            <FormField v-slot="{ componentField }" :validate-on-blur="!isFieldDirty" class="flex flex-col" name="amountPaid">
              <div class="flex flex-col w-full">
                <FormLabel for="amountPaid" class="leading-none text-muted-foreground"> Amount Paid </FormLabel>
                <FormControl>
                  <UiInput
                    v-bind="componentField"
                    id="amountPaid"
                    disabled
                    class="mt-2.5 h-10 border border-border"
                    type="number"
                    placeholder="Amount Paid"
                  />
                </FormControl>
                <FormMessage />
              </div>
            </FormField>
            <FormField v-slot="{ componentField }" name="currency">
              <FormItem class="relative">
                <FormLabel for="currency" data-layername="dropDownField" class="leading-none text-muted-foreground"> Currency </FormLabel>
                <UiSelect v-bind="componentField">
                  <FormControl>
                    <UiSelectTrigger disabled class="border-border border max-w-[125px] w-[125px]">
                      <UiSelectValue class="items-start text-start" placeholder="Currency" />
                    </UiSelectTrigger>
                  </FormControl>
                  <UiSelectContent>
                    <UiSelectGroup>
                      <UiSelectItem class="pl-2" value="usd"> USD </UiSelectItem>
                      <UiSelectItem class="pl-2" value="eur"> EUR </UiSelectItem>
                      <UiSelectItem class="pl-2" value="ron"> RON </UiSelectItem>
                    </UiSelectGroup>
                  </UiSelectContent>
                </UiSelect>
              </FormItem>
            </FormField>
          </div>
          <FormField v-slot="{ componentField, value }" name="dop">
            <FormItem class="flex flex-col gap-2">
              <FormLabel class="text-muted-foreground"> Payment Date </FormLabel>
              <UiPopover>
                <UiPopoverTrigger as-child>
                  <FormControl>
                    <UiButton variant="outline" :class="cn('ps-3 text-start font-normal border-border', !value && 'text-muted-foreground')">
                      <span>{{ value ? format(value, 'PPP') : 'Pick a date' }}</span>
                      <CalendarDays class="ms-auto h-4 w-4 opacity-50" />
                    </UiButton>
                  </FormControl>
                </UiPopoverTrigger>
                <UiPopoverContent class="p-0">
                  <UiCalendar v-bind="componentField" />
                </UiPopoverContent>
              </UiPopover>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField v-slot="{ componentField }" name="reference" :validate-on-blur="!isFieldDirty">
            <FormItem>
              <FormLabel>Payment Reference</FormLabel>
              <FormControl>
                <UiInput type="text" placeholder="Payment Reference" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField v-slot="{ componentField }" name="comments">
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <UiTextarea placeholder="Comments..." class="resize-none min-h-32 border-border bg-muted" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <div class="flex gap-4 items-center mt-10 w-full text-base font-medium leading-7 text-white whitespace-nowrap">
            <UiButton class="h-12 w-full"> Submit </UiButton>
          </div>
        </form>
      </section>
    </UiDialogContent>
  </UiDialog>
</template>

<style scoped></style>
