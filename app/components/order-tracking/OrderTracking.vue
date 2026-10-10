<script setup lang="ts">
import { DotIcon, FilePlus2, FileSpreadsheet, MapPin, MoreVertical, Package, Truck } from '@lucide/vue';
import { cn } from '~/lib/utils';
import { OrderStatus, PaymentStatusEnum, type OrderInterface } from '~~/types';
import { getPaymentStatusById, unknownPaymentStatusLabel } from '~~/types/order-summary/item';
import type { ShippingAddressInterface } from '~~/types/auth/user-interface';

// interface OrderStatus {
//     processing: boolean;
//     packaging: boolean;
//     transit: boolean;
//     fulfilled: boolean;
// }

enum TrackingStatus {
  Processing = 'processing',
  Packaging = 'packaging',
  Transit = 'transit',
  Fulfilled = 'fulfilled',
}

interface Order {
  orderId: string;
  awb: string | null;
  amount: number;
  status: OrderStatus;
  company: {
    name: string;
    initial: string;
  };
  address: ShippingAddressInterface;
  billingStatus: PaymentStatusEnum | undefined;
  orderDate: Date;
  trackingStatus: TrackingStatus;
}

const DEFAULT_ADDRESS: ShippingAddressInterface = {
  _id: 'demo-address',
  name1: 'Address unavailable',
  name2: '',
  default: false,
  city: 'N/A',
  region: 'N/A',
  country: 'N/A',
  postcode: 'N/A',
};

const trackingStatusOrder: TrackingStatus[] = [
  TrackingStatus.Processing,
  TrackingStatus.Packaging,
  TrackingStatus.Transit,
  TrackingStatus.Fulfilled,
];

const props = defineProps<{
  order: OrderInterface;
}>();

const getTrackingStatus = (order: OrderInterface): TrackingStatus => {
  const trackingHistory = order?.shippingDetails?.statusTracking?.history ?? [];

  if (trackingHistory.some((status) => status.code === 0)) {
    return TrackingStatus.Fulfilled;
  }

  if (trackingHistory.some((status) => status.code === 20050)) {
    return TrackingStatus.Transit;
  }

  if (order?.status === OrderStatus.Packaging) {
    return TrackingStatus.Packaging;
  }

  return TrackingStatus.Processing;
};

const processedOrder = computed<Order>(() => {
  const companyName = props.order?.user?.companyDetails?.name || props.order?.userName || 'N/A';

  return {
    orderId: props.order?.shortId || 'N/A',
    awb: props.order?.shippingDetails?.statusTracking?.awb || null,
    amount: props.order?.total || 0,
    status: props.order?.status || OrderStatus.Processing,
    company: {
      name: companyName,
      initial: companyName.charAt(0) || 'N',
    },
    address: props.order?.shippingDetails?.address || DEFAULT_ADDRESS,
    billingStatus: props.order?.paymentDetails?.status,
    orderDate: props.order?.createdAt ? new Date(props.order.createdAt) : new Date(),
    trackingStatus: getTrackingStatus(props.order),
  };
});

const formattedDate = computed(() => {
  const date = new Date(processedOrder.value.orderDate);
  return {
    day: date.getDate(),
    month: date.toLocaleString('en-US', { month: 'long' }),
    year: date.getFullYear(),
  };
});

const statusColor = computed(
  () =>
    ({
      processing: 'bg-purple-500',
      packaging: 'bg-blue-500',
      transit: 'bg-blue-500',
      fulfilled: 'bg-emerald-500',
    })[processedOrder.value.trackingStatus] || 'bg-purple-500',
);

const statusIcons = {
  processing: FilePlus2,
  packaging: Package,
  transit: Truck,
  fulfilled: MapPin,
};

const billingStatusColor = computed(() => {
  const status = processedOrder.value.billingStatus;
  if (status === undefined || getPaymentStatusById(status) === null) return 'bg-gray-500';
  const statusColors: Partial<Record<PaymentStatusEnum, string>> = {
    [PaymentStatusEnum.Paid]: 'bg-green-500',
    [PaymentStatusEnum.Pending]: 'bg-orange-500',
    [PaymentStatusEnum.Canceled]: 'bg-gray-500',
    [PaymentStatusEnum.Declined]: 'bg-red-500',
    [PaymentStatusEnum.Failed]: 'bg-red-500',
    [PaymentStatusEnum.Refunding]: 'bg-yellow-500',
    [PaymentStatusEnum.Refunded]: 'bg-yellow-600',
  };

  return statusColors[status] || 'bg-orange-500';
});

const billingStatusLabel = computed(() => {
  return getPaymentStatusById(processedOrder.value.billingStatus) ?? unknownPaymentStatusLabel;
});

const isTrackingStepActive = (status: TrackingStatus) => {
  return trackingStatusOrder.indexOf(status) <= trackingStatusOrder.indexOf(processedOrder.value.trackingStatus);
};

const handleMoreOptions = () => {
  // Implement more options menu logic
};
</script>

<template>
  <section
    class="w-full mx-auto flex overflow-hidden flex-col gap-8 p-6 bg-white rounded-xl border border-solid border-D3D3D3-300 max-md:px-4 max-md:gap-4"
  >
    <section class="flex flex-col w-full">
      <div class="flex flex-wrap gap-10 justify-between items-start w-full max-md:gap-4">
        <div
          class="flex flex-col lg:flex-row flex-wrap gap-6 items-center text-xl sm:text-2xl leading-none w-full md:w-auto max-md:gap-3 border md:border-none border-grey-300 p-2 bg-light-100 md:bg-transparent rounded-lg"
        >
          <div class="flex justify-between md:justify-start gap-3 items-center self-stretch my-auto w-full md:w-auto">
            <span class="text-gray-500 font-normal">Order ID:</span>
            <span class="font-medium text-zinc-800">{{ processedOrder.orderId }}</span>
          </div>
          <div class="hidden lg:block w-px h-6 bg-stone-300" />
          <div
            class="flex justify-between md:justify-start gap-3 items-center self-stretch my-auto text-slate-500 w-full md:w-auto text-base sm:text-2xl"
          >
            <span class="font-normal">AWB:</span>
            <p v-if="processedOrder.awb" class="flex items-center gap-2">
              {{ processedOrder.awb }}
              <CopyClipboard :text="processedOrder.awb" />
            </p>
            <p v-else class="flex items-center gap-2 text-sm text-neutral-700">
              <span class="bg-orange-500 flex shrink-0 self-stretch my-auto w-3 h-3 rounded-full" aria-hidden="true" />
              Pending
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-4 items-start w-full md:w-auto max-md:gap-4">
          <UiBadge class="flex gap-3 items-center font-normal px-3 py-1 text-sm rounded-md h-8" variant="outline">
            <div class="text-zinc-800">
              <span>{{ processedOrder.amount.toFixed(2) }}</span>
              <span> Lei</span>
            </div>
            <UiSeparator class="h-4 bg-grey-300" orientation="vertical" />

            <span class="capitalize flex gap-1">
              <span :class="billingStatusColor" class="flex shrink-0 self-stretch my-auto w-3 h-3 rounded-full" aria-hidden="true" />
              {{ billingStatusLabel }}
            </span>
          </UiBadge>
          <UiButton
            class="flex justify-center items-center p-1 w-8 h-8 rounded-md bg-zinc-100"
            aria-label="More options"
            size="xs"
            @click="handleMoreOptions"
          >
            <MoreVertical class="w-6 h-6 text-black stroke-1" />
          </UiButton>
        </div>
      </div>

      <div class="flex flex-wrap items-center mt-8 w-full lg:w-fit gap-4 max-md:mt-4">
        <div class="flex gap-2 items-center font-medium w-full lg:w-auto">
          <div class="w-8 h-8 flex items-center justify-center bg-sky-100 rounded-full text-sky-500">
            {{ processedOrder.company.initial }}
          </div>
          <span class="text-sm leading-6 text-zinc-800">{{ processedOrder.company.name }}</span>
        </div>
        <div class="hidden lg:block w-px h-6 bg-stone-300" />
        <div class="flex gap-1 items-center text-sm leading-6 text-zinc-800 w-fit md:flex-1">
          <MapPin class="w-5 h-5 shrink-0" />
          <address class="not-italic">
            {{
              `${processedOrder.address.name1}, ${processedOrder.address.name2 || ''}, ${processedOrder.address.city}, ${
                processedOrder.address.region
              }, ${processedOrder.address.country}`
            }}
          </address>
        </div>
        <div class="hidden lg:block w-px h-6 bg-stone-300" />
        <div class="flex gap-1 items-center text-sm leading-6 text-zinc-800">
          <FileSpreadsheet class="w-5 h-5" />
          <span class="capitalize">{{ billingStatusLabel }}</span>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-6 px-4 py-6 rounded-xl border border-solid bg-light-100 border-grey-300">
      <div class="flex md:flex-wrap gap-10 justify-between md:items-center text-sm leading-6 max-md:gap-4">
        <div class="flex flex-col md:flex-row md:items-center max-md:gap-1 w-full md:w-auto">
          <h2 class="font-medium text-zinc-800">Order {{ processedOrder.status === OrderStatus.Pending ? 'received' : 'updated' }}</h2>
          <DotIcon class="hidden md:block text-stone-300" />
          <time class="flex gap-1 text-gray-500">
            <span>{{ formattedDate.day }}</span>
            <span>{{ formattedDate.month }}</span>
            <span>{{ formattedDate.year }}</span>
          </time>
        </div>
        <UiBadge
          :class="
            cn(
              'flex items-start md:items-center justify-end md:justify-start gap-2 bg-light-100 text-neutral-700 font-normal p-0 text-sm rounded-md w-full md:w-auto',
            )
          "
        >
          <span :class="statusColor" class="flex shrink-0 self-stretch w-3 h-3 rounded-full mt-1" aria-hidden="true" />
          <span class="capitalize">{{ processedOrder.status }}</span>
        </UiBadge>
      </div>

      <div class="relative flex justify-between flex-wrap gap-3 items-center min-h-[36px]">
        <template v-for="status in trackingStatusOrder" :key="status">
          <component
            :is="statusIcons[status]"
            class="w-6 h-6 md:w-8 md:h-8 lg:w-9 lg:h-9 shrink-0 z-10 bg-light-100 p-1"
            :class="{
              'text-slate-500': isTrackingStepActive(status),
              'text-gray-300': !isTrackingStepActive(status),
            }"
          />
        </template>
        <div
          class="mx-6 md:mx-8 lg:mx-10 absolute inset-0 top-4 lg:top-3.5 flex-1 h-1 md:h-1.5 lg:h-2 bg-gray-200 rounded-full overflow-hidden min-w-[100px] md:min-w-[240px]"
        >
          <div
            class="h-full transition-all duration-300 ease-in-out rounded-full"
            :class="{
              'bg-emerald-500 full': processedOrder.trackingStatus === TrackingStatus.Fulfilled,
              'bg-blue-500 w-[85.5%]': processedOrder.trackingStatus === TrackingStatus.Transit,
              'bg-blue-500 w-1/2': processedOrder.trackingStatus === TrackingStatus.Packaging,
              'bg-purple-500 w-[12.5%]': processedOrder.trackingStatus === TrackingStatus.Processing,
            }"
          />
        </div>
      </div>
    </section>
  </section>
</template>
