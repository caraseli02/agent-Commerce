<script setup lang="ts">
import {
  ArchiveIcon,
  ChevronDownIcon,
  HandCoinsIcon,
  PackageXIcon,
  PrinterIcon,
  ReceiptTextIcon,
  SettingsIcon,
  Undo2Icon,
} from '@lucide/vue';
import type { PropType } from 'vue';
import { OrderStatus, PaymentStatusEnum, type OrderInterface } from '~/types';
import { toast } from '~/components/ui/toast';
import { cancelOrder as cancelOrderApi } from '~/composables/api/orders';

const props = defineProps({
  order: {
    type: Object as PropType<OrderInterface>,
    required: true,
  },
});

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

const actions = [
  { title: 'Archive', enable: true, icon: ArchiveIcon, value: 'archive' },
  // {
  //     title: 'Mark as paid',
  //     enable: props.order?.status !== OrderStatus.Canceled && props.order.paymentDetails?.type === PaymentTypeEnum.Bank,
  //     icon: CheckCheckIcon,
  //     value: 'mark_as_paid',
  //     action: markAsPaid,
  // },
  { title: 'Print Order', enable: true, icon: PrinterIcon, value: 'print_order' },
  {
    title: 'Print Shipping Label',
    enable: props.order?.shippingDetails.statusTracking?.awb,
    icon: ReceiptTextIcon,
    value: 'print_shipping_label',
  },
  {
    title: 'Cancel Order',
    enable:
      props.order?.status !== OrderStatus.Completed &&
      props.order?.status !== OrderStatus.Canceled &&
      props.order?.paymentDetails?.status !== PaymentStatusEnum.Paid,
    icon: PackageXIcon,
    value: 'cancel_order',
    action: cancelOrder,
  },
];
</script>

<template>
  <section class="flex justify-end gap-3 mt-3 mb-9">
    <UiButton class="gap-2" variant="secondary">
      <HandCoinsIcon class="w-5 h-5 stroke-1.5" />
      Returns
    </UiButton>
    <UiButton class="gap-2" variant="secondary">
      <Undo2Icon class="w-5 h-5 stroke-1.5" />
      Returns
    </UiButton>
    <UiPopover>
      <UiPopoverTrigger>
        <UiButton variant="outline" class="flex justify-between w-24 md:w-[200px]">
          <div class="flex items-center gap-2">
            <component :is="SettingsIcon" class="w-6 h-6 stroke-1" />
            <span class="text-sm hidden md:block">More Actions</span>
          </div>
          <ChevronDownIcon class="w-5 h-5" />
        </UiButton>
      </UiPopoverTrigger>
      <UiPopoverContent class="p-3 w-[240] mr-6">
        <UiButton
          v-for="btn in actions"
          :key="btn.value"
          variant="ghost"
          :disabled="!btn.enable"
          class="flex gap-3 w-full justify-start"
          :value="btn.value"
          @click="btn.action"
        >
          <component :is="btn.icon" class="w-6 h-6 stroke-1" />
          <span>{{ btn.title }}</span>
        </UiButton>
      </UiPopoverContent>
    </UiPopover>
  </section>
</template>

<style scoped></style>
