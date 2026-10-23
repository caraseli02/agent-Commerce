<script setup lang="ts">
import { FileText } from '@lucide/vue';
import { DotsVerticalIcon } from '@radix-icons/vue';
import { formatReviewerDate } from '~~/helpers/reviewer-dates';
import { PaymentStatusEnum, PaymentTypeEnum } from '~~/types';

interface OrderTypeValue {
  badge: { text: string };
  label: string;
}

interface Props {
  orderId: string;
  orderType: OrderTypeValue;
  date: string;
  shippingMethod?: string;
  pickupDate?: string;
  paymentMethod?: Record<string, unknown>;
  paymentStatus?: PaymentStatusEnum;
  onDownloadDocument: () => void;
}

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col md:flex-row gap-4 justify-between w-full">
    <section
      class="flex flex-col gap-4 w-full bg-muted md:bg-transparent border md:border-none border-border p-2 rounded-lg md:rounded-none"
    >
      <div class="flex flex-wrap gap-8 xl:gap-10">
        <h4 class="text-2xl leading-8 text-muted-foreground flex justify-between md:justify-start w-full">
          Order ID: <span class="text-foreground ml-4">{{ orderId }}</span>
        </h4>
        <section class="hidden md:flex gap-4 items-center">
          <h2 class="self-stretch my-auto text-sm leading-none text-muted-foreground">Order Type</h2>
          <div class="flex overflow-hidden gap-2 justify-center items-center self-stretch my-auto rounded-md">
            <span
              class="overflow-hidden flex justify-center items-center p-0.5 my-auto w-4 h-4 text-xs font-medium leading-none text-center text-white whitespace-nowrap bg-emerald-500 rounded-[100px]"
            >
              {{ orderType.badge.text }}
            </span>
            <p class="self-stretch my-auto text-sm leading-none text-foreground">
              {{ orderType.label }}
            </p>
          </div>
        </section>
      </div>
      <div class="flex flex-col xl:flex-row flex-wrap gap-3 pr-20 md:mt-3 lg:mt-0 text-sm leading-6 max-md:flex-wrap max-md:pr-5">
        <div class="flex gap-2">
          <div class="text-muted-foreground">Order Date:</div>
          <div class="text-foreground">
            {{ date }}
          </div>
        </div>
        <UiSeparator class="hidden lg:block h-4 bg-muted" orientation="vertical" />
        <div class="flex gap-2">
          <div class="text-muted-foreground">Shipping Method:</div>
          <div class="text-foreground font-medium">
            {{ shippingMethod }}
          </div>
        </div>
        <UiSeparator v-if="pickupDate" class="hidden lg:block h-4 bg-muted" orientation="vertical" />
        <div v-if="pickupDate" class="flex gap-2">
          <div class="text-muted-foreground">Estimated pick-up date:</div>
          <div class="text-foreground font-medium">
            {{ formatReviewerDate(pickupDate) }}
          </div>
        </div>
      </div>
    </section>
    <section class="flex md:hidden gap-4 items-center bg-muted border border-border p-2 rounded-lg">
      <h2 class="self-stretch my-auto text-sm leading-none text-muted-foreground">Order Type</h2>
      <div class="flex overflow-hidden gap-2 justify-center items-center self-stretch my-auto rounded-md">
        <span
          class="overflow-hidden flex justify-center items-center p-0.5 my-auto w-4 h-4 text-xs font-medium leading-none text-center text-white whitespace-nowrap bg-emerald-500 rounded-[100px]"
        >
          {{ orderType.badge.text }}
        </span>
        <p class="self-stretch my-auto text-sm leading-none text-foreground">
          {{ orderType.label }}
        </p>
      </div>
    </section>
    <div
      class="md:w-full lg:w-fit flex justify-between md:justify-end gap-2 md:gap-4 text-sm font-medium leading-6 text-white max-md:flex-wrap"
    >
      <UiButton
        v-if="paymentMethod?.type === PaymentTypeEnum.Bank && paymentStatus !== PaymentStatusEnum.Paid"
        variant="secondary"
        size="xs"
        class="flex gap-2 justify-center text-muted-foreground rounded-lg bg-muted"
        @click="onDownloadDocument"
      >
        <FileText class="shrink-0 w-4 aspect-square stroke-[1.5]" />
        Proforma Invoice
      </UiButton>
      <UiButton
        v-if="
          paymentMethod?.type !== PaymentTypeEnum.Bank ||
          (paymentMethod?.type === PaymentTypeEnum.Bank && paymentStatus === PaymentStatusEnum.Paid)
        "
        variant="secondary"
        size="xs"
        class="flex gap-2 justify-center text-muted-foreground rounded-lg bg-muted"
        @click="onDownloadDocument"
      >
        <FileText class="shrink-0 w-4 aspect-square stroke-[1.5]" />
        Invoices
      </UiButton>
      <UiButton variant="secondary" size="icon" class="flex gap-2 h-8 justify-center text-muted-foreground rounded-lg bg-muted">
        <DotsVerticalIcon class="shrink-0 w-4 aspect-square stroke-[1.5]" />
      </UiButton>
    </div>
  </div>
</template>
