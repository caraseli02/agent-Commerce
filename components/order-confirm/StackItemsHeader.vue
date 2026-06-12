<script setup lang="ts">
import { ArrowRight, BarcodeIcon, InfoIcon, MapPin } from 'lucide-vue-next';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { ref } from 'vue';
import moment from 'moment/moment';
import { useNuxtApp } from '#app';
import { AccountRole, OrderStatus, PaymentTypeEnum, type OrderInterface, type ShippingCourierCreateOrderResponse } from '~/types';
import { toast } from '~/components/ui/toast';
import { useAuthStore } from '~/store/authStore';
import { orderType, statusColors } from '~/components/admin-table/order/options';
import { paymentStatusOptions } from '~/components/client-table/transaction/options';

const { $api } = useNuxtApp();
const authStore = useAuthStore();

const props = defineProps<{
    order: OrderInterface;
}>();

const statuses = ref(
    Object.values(OrderStatus).map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
        color: statusColors[status],
    }))
);
const paymentStatuses = ref(paymentStatusOptions);

const user = authStore.userDetails;
const isAdmin = ref(user?.role !== AccountRole.Client);
const bankTransferPayment = ref(props.order.paymentDetails?.type === PaymentTypeEnum.Bank || false);
const awb = ref<string | null>(props.order.shippingDetails.statusTracking?.awb || null);

const breakpoints = useBreakpoints(breakpointsTailwind);
const smallerThanSm = breakpoints.smaller('sm'); // sm and larger
const smAndLarger = breakpoints.greaterOrEqual('sm'); // sm and larger

const generateAWB = async () => {
    const result = (await $api.orders.retryFailedShippingOrders(props.order._id)) as {
        status: string;
        data: ShippingCourierCreateOrderResponse;
    };

    if (result.status !== 'success') {
        toast({
            title: 'Error',
            description: 'Failed to generate AWB',
            variant: 'destructive',
        });
        return;
    }

    if (result.data) {
        awb.value = result.data.awb;
    }
};

const getStatusByOrder = () => {
    return statuses.value.find((status) => status.value === props.order.status) || statuses.value[0];
};

const getOrderTypeValueByOrder = () => {
    return orderType.find((type) => type.value === props.order.type) || orderType[0];
};

const getPaymentStatusValueByOrder = () => {
    return paymentStatuses.value.find((status) => status.value === props.order.paymentDetails?.status) || paymentStatuses.value[0];
};

const showTrackingDialog = ref(false);
</script>

<template>
    <section class="flex flex-col">
        <div class="flex justify-end md:justify-between flex-wrap gap-3 items-center w-full max-md:max-w-full">
            <UiPopover v-if="smAndLarger && isAdmin">
                <UiPopoverTrigger>
                    <section class="flex gap-3 items-center text-sm leading-6 whitespace-nowrap text-zinc-800">
                        <h2 class="self-stretch text-gray-500">AWB</h2>
                        <InfoIcon v-if="isAdmin" class="object-contain shrink-0 self-stretch w-4 aspect-square text-slate-500" />
                        <div v-if="!awb" class="flex overflow-hidden gap-2 justify-center items-center rounded-md">
                            <span class="flex shrink-0 w-3 h-3 bg-amber-500 rounded-full fill-amber-500" aria-hidden="true" />
                            <p class="self-stretch">Pending</p>
                        </div>
                        <p v-if="awb" class="self-stretch my-auto font-medium">
                            {{ awb }}
                        </p>
                    </section>
                </UiPopoverTrigger>
                <UiPopoverContent v-if="isAdmin" class="w-fit flex flex-col gap-2 p-2" align="end">
                    <UiButton v-if="!awb" class="hover:text-blue-500 justify-start gap-1" variant="ghost" size="sm" @click="generateAWB">
                        <BarcodeIcon class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
                        Generate AWB
                        <span
                            class="flex shrink-0 self-stretch my-auto w-3 h-3 bg-amber-500 rounded-full fill-amber-500"
                            aria-hidden="true"
                        />
                    </UiButton>
                    <UiButton v-if="awb" disabled class="hover:text-blue-500 justify-start gap-1" variant="ghost" size="sm">
                        <BarcodeIcon class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
                        Generate AWB
                        <span
                            class="flex shrink-0 self-stretch my-auto w-3 h-3 bg-emerald-500 rounded-full fill-emerald-500"
                            aria-hidden="true"
                        />
                    </UiButton>
                </UiPopoverContent>
            </UiPopover>
            <div v-if="!isAdmin" class="hidden md:flex gap-3 items-center self-stretch text-sm leading-none">
                <h4 class="self-stretch my-auto text-gray-500">Order Status</h4>
                <OrderConfirmStatusDisplay :status-color="getStatusByOrder().color" :status-text="getStatusByOrder().value" />
            </div>
            <section class="flex gap-2">
                <div v-if="isAdmin" class="flex gap-3 items-center self-stretch my-auto text-sm leading-none">
                    <h4 class="self-stretch my-auto text-gray-500">Order Status</h4>
                    <OrderConfirmStatusSelect :statuses="statuses" :default-value="getStatusByOrder()" :order-id="order._id" />
                </div>
                <div class="flex gap-3 items-center self-stretch my-auto">
                    <UiButton
                        v-if="!isAdmin"
                        size="xs"
                        class="flex overflow-hidden justify-center items-center self-stretch px-4 py-0 my-auto text-sm font-medium leading-6 text-white bg-sky-500 rounded-md"
                        @click="showTrackingDialog = true"
                    >
                        <MapPin class="object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
                        <span class="self-stretch py-1 pl-2 my-auto">Track Order</span>
                    </UiButton>
                    <OrderConfirmActionMenu
                        v-if="isAdmin"
                        :initial-amount-paid="order.total"
                        :initial-currency="order.currency"
                        :order="order"
                        @show-tracking-dialog="showTrackingDialog = true"
                    />
                </div>
            </section>
        </div>
        <div
            class="flex flex-wrap gap-4 md:gap-10 justify-between items-start p-4 mt-4 w-full rounded-lg border border-solid bg-stone-50 border-grey-300 max-md:max-w-full"
        >
            <div
                v-if="!isAdmin && smallerThanSm"
                class="flex md:hidden justify-between w-full gap-3 items-center self-stretch my-auto text-sm leading-none"
            >
                <h4 class="self-stretch my-auto text-gray-500">Order Status</h4>
                <OrderConfirmStatusDisplay :status-color="getStatusByOrder().color" :status-text="getStatusByOrder().value" />
            </div>
            <UiPopover v-if="isAdmin && smallerThanSm">
                <UiPopoverTrigger class="w-full">
                    <section class="flex justify-between w-full gap-3 items-center text-sm leading-6 whitespace-nowrap text-zinc-800">
                        <h2 class="self-stretch my-auto text-gray-500">AWB</h2>
                        <section class="flex gap-1">
                            <div
                                v-if="!awb"
                                class="flex overflow-hidden gap-2 justify-center items-center self-stretch my-auto leading-none rounded-md"
                            >
                                <span
                                    class="flex shrink-0 self-stretch my-auto w-3 h-3 bg-amber-500 rounded-full fill-amber-500"
                                    aria-hidden="true"
                                />
                                <p class="self-stretch my-auto">Pending</p>
                            </div>
                            <p v-if="awb" class="self-stretch my-auto font-medium">
                                {{ awb }}
                            </p>
                            <InfoIcon
                                class="object-contain shrink-0 self-stretch my-auto w-4 aspect-square text-slate-500"
                                @click="generateAWB"
                            />
                        </section>
                    </section>
                </UiPopoverTrigger>
                <UiPopoverContent class="w-fit flex flex-col gap-2 p-2" align="end">
                    <UiButton v-if="!awb" class="hover:text-blue-500 justify-start gap-1" variant="ghost" size="sm" @click="generateAWB">
                        <BarcodeIcon class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
                        Generate AWB
                        <span
                            class="flex shrink-0 self-stretch my-auto w-3 h-3 bg-amber-500 rounded-full fill-amber-500"
                            aria-hidden="true"
                        />
                    </UiButton>
                    <UiButton v-if="awb" disabled class="hover:text-blue-500 justify-start gap-1" variant="ghost" size="sm">
                        <BarcodeIcon class="mr-1 object-contain shrink-0 self-stretch my-auto w-4 aspect-square" />
                        Generate AWB
                        <span
                            class="flex shrink-0 self-stretch my-auto w-3 h-3 bg-emerald-500 rounded-full fill-emerald-500"
                            aria-hidden="true"
                        />
                    </UiButton>
                </UiPopoverContent>
            </UiPopover>
            <div class="flex justify-between w-full md:w-fit gap-4 items-center min-h-[20px]">
                <span class="self-stretch my-auto text-sm leading-none text-gray-500">Order Type</span>
                <div class="flex overflow-hidden gap-2 justify-center items-center self-stretch my-auto rounded-md">
                    <span
                        class="overflow-hidden flex justify-center items-center my-auto w-4 h-4 text-xs font-medium leading-none text-center text-white whitespace-nowrap bg-emerald-500 rounded-[100px]"
                        >{{ getOrderTypeValueByOrder().badge.text }}</span
                    >
                    <span class="self-stretch my-auto text-sm leading-none text-zinc-800">{{ getOrderTypeValueByOrder().label }}</span>
                </div>
            </div>
            <UiPopover>
                <UiPopoverTrigger class="w-full md:w-fit">
                    <div class="flex gap-3 justify-between w-full md:w-fit items-center text-sm leading-none min-h-[20px]">
                        <span class="self-stretch my-auto text-gray-500">Payment Status</span>
                        <span class="flex gap-2">
                            <OrderConfirmStatusDisplay
                                :status-color="getPaymentStatusValueByOrder().color"
                                :status-text="getPaymentStatusValueByOrder().label ?? 'Unknown'"
                            />
                            <InfoIcon class="w-4 h-4 text-slate-500" />
                        </span>
                    </div>
                </UiPopoverTrigger>
                <UiPopoverContent class="w-fit flex flex-col gap-2 p-3 max-w-xs rounded-xl" align="end">
                    <article class="flex flex-col w-full">
                        <h2 class="text-sm font-medium leading-6 text-zinc-800">Payment Details</h2>
                        <div class="flex flex-col mt-3 w-full">
                            <dl class="flex flex-col w-full text-xs leading-loose">
                                <div class="flex gap-10 justify-between items-start w-full">
                                    <dt class="text-gray-500">Amount</dt>
                                    <dd class="text-zinc-800">{{ order.total }} Lei</dd>
                                </div>
                                <div class="flex gap-10 justify-between items-start mt-2 w-full">
                                    <dt class="text-gray-500">Date</dt>
                                    <dd class="text-zinc-800">
                                        {{ moment(order.createdAt).format('DD MMMM YYYY, HH:mm') }}
                                    </dd>
                                </div>
                                <div class="flex gap-10 justify-between items-start mt-2 w-full whitespace-nowrap">
                                    <dt class="text-gray-500">Reference</dt>
                                    <dd class="text-zinc-800">
                                        {{ order.shortId }}
                                    </dd>
                                </div>
                            </dl>
                            <template v-if="bankTransferPayment">
                                <div class="gap-2 self-stretch mt-2 w-full text-gray-500 whitespace-nowrap">Comments</div>
                                <p
                                    class="overflow-hidden text-xs flex-1 shrink gap-2 p-3 mt-2 w-full leading-5 rounded-lg border border-solid bg-stone-50 border-neutral-100 text-zinc-800"
                                >
                                    Please deliver after 4PM and call me prior to delivery. Please deliver after 4PM and call me prior to
                                    delivery.
                                </p>
                            </template>
                            <UiSeparator v-else class="bg-grey-100 mt-3" />
                        </div>
                        <div class="flex justify-end items-center">
                            <UiButton class="w-fit gap-1 mt-1" variant="link">
                                View more
                                <ArrowRight class="w-4 h-4" />
                            </UiButton>
                        </div>
                    </article>
                </UiPopoverContent>
            </UiPopover>
        </div>
    </section>
    <LazyOrderConfirmTrackingDialog v-model="showTrackingDialog" :order="order" />
</template>

<style scoped></style>
