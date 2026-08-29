<script setup lang="ts">
import { InfoIcon } from '@lucide/vue';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import { calculateOrderMoney, DEFAULT_ORDER_VAT_RATE } from '~/helpers/order-money';
import { OrderType } from '~/types';
import type { OrderInterface, OrderRequestInterface } from '~/types';
import { useAuthStore } from '~/store/authStore';

const breakpoints = useBreakpoints(breakpointsTailwind);
const lgAndLarger = breakpoints.greaterOrEqual('lg'); // sm and larger
const generalSettings = useAuthStore().generalSettings;

const props = defineProps<{
  data: OrderRequestInterface;
  orderType: OrderType;
}>();

const type = props.orderType === OrderType.Stock ? '' : 'Stock';
const stockItems = ref(props.data.products || []);
const stockOrder = ref(props.data as OrderRequestInterface);

const shippingMethod = computed(() =>
  generalSettings?.orderSettings?.deliveryTypes.find((type) => type._id === stockOrder.value.shippingDetails.deliveryTypeId),
);

const vatPercent = Math.round(DEFAULT_ORDER_VAT_RATE * 100);

const lineVatAmount = (quantity: number, unitPrice: number) => calculateOrderMoney({ subtotal: quantity * unitPrice }).vatAmount;

const lineSubtotalWithVat = (quantity: number, unitPrice: number) => {
  const money = calculateOrderMoney({ subtotal: quantity * unitPrice });
  return money.subtotal + money.vatAmount;
};

const payment = computed(() => {
  const subtotal = Number(stockOrder.value.subtotal.toFixed(2));
  const discountRate = stockOrder.value.discount?.value || 0;
  const orderMoney = calculateOrderMoney({
    subtotal,
    discountRate,
    shippingCost: stockOrder.value.shippingCost || 0,
  });
  const smallOrderCharge = stockOrder.value.smallOrderCost || 0;
  const total = Number(stockOrder.value.total?.toFixed(2));

  return {
    subtotal,
    discountRate,
    discountAmount: orderMoney.discountAmount.toFixed(2),
    handlingCharge: smallOrderCharge,
    shippingCost: stockOrder.value.shippingCost || 0,
    taxRate: Math.round(orderMoney.vatRate * 100),
    taxAmount: orderMoney.vatAmount,
    stockOrderTotal: total,
  };
});
</script>

<template>
  <div v-if="stockItems.length > 0" class="flex flex-col gap-4">
    <OrderConfirmStackItemsHeader :order="data as unknown as OrderInterface" />
    <section class="flex flex-col gap-10 px-4 py-6 md:p-6 border border-gray-300 rounded-xl">
      <div v-if="lgAndLarger" class="flex flex-col lg:flex-row gap-2 lg:gap-4 justify-between self-stretch">
        <span class="text-sm font-semibold leading-6 text-neutral-700 w-full max-w-[412px]">Product Details</span>
        <span class="text-sm font-semibold leading-6 text-neutral-700 text-end min-w-[86px]">Unit Price</span>
        <span class="text-sm font-semibold leading-6 text-neutral-700 text-end min-w-[86px]">Quantity</span>
        <span class="text-sm font-semibold leading-6 text-neutral-700 text-end min-w-[86px]">Delivered</span>
        <span class="text-sm font-semibold leading-6 text-neutral-700 text-end min-w-[86px]">Payment Status</span>
        <span class="text-sm font-semibold leading-6 text-neutral-700 text-end min-w-[86px]">Tax (VAT {{ vatPercent }}%)</span>
        <span class="text-sm font-semibold leading-6 text-neutral-700 text-end min-w-[86px]">Subtotal</span>
      </div>
      <div class="flex flex-col gap-6">
        <div
          v-for="item in stockItems"
          :key="'stock-' + item.id"
          class="flex flex-col lg:flex-row gap-2 lg:gap-4 justify-between self-stretch border-b last:border-b-0 lg:border-b-0"
        >
          <div class="flex gap-3 lg:mt-6 w-full lg:max-w-[412px]">
            <figure class="flex h-fit justify-center items-center rounded-lg border border-solid border-grey-300">
              <ImageWithFallback
                :src="item.productEntity?.details?.ProductImage?.ProductImageSmall"
                alt="Product image"
                class="aspect-square max-h-[60px] min-w-[60px] lg:max-h-[72px] lg:w-[72px] rounded-lg"
              />
            </figure>
            <div class="flex flex-col w-full md:max-w-none lg:max-w-[328px]">
              <div class="flex flex-row gap-2">
                <span class="text-sm font-medium leading-6 text-gray-500">Item:</span>
                <div class="flex gap-5 justify-between">
                  <span class="text-sm font-medium leading-6 text-neutral-700 max-w-[150px] md:max-w-[235px] lg:max-w-[328px] truncate">{{
                    item.productEntity?.name
                  }}</span>
                  <span
                    v-if="item.discount.value"
                    class="justify-center px-2 my-auto text-xs font-semibold leading-5 text-red-500 bg-white rounded-3xl border border-red-500 border-solid"
                  >
                    {{ item.discount.value }} %
                  </span>
                </div>
              </div>
              <div class="flex flex-row gap-2 text-sm font-medium leading-6 whitespace-nowrap">
                <span class="text-gray-500">Description:</span>
                <span class="text-ellipsis text-neutral-700 w-full max-w-[150px] md:max-w-[235px] lg:max-w-[328px] truncate">
                  {{ item.productEntity?.description }}
                </span>
              </div>
              <div class="flex flex-row gap-2 text-sm font-medium leading-6 whitespace-nowrap">
                <span class="text-gray-500">Manufacturer:</span>
                <span class="truncate text-neutral-700 max-w-[150px] md:max-w-[235px] lg:max-w-[328px]">{{
                  item.productEntity?.manufacturer
                }}</span>
              </div>
            </div>
          </div>
          <template v-if="lgAndLarger">
            <div
              class="flex justify-center items-center flex-col text-sm min-w-[86px]"
              :class="item.discount.value ? 'justify-center self-stretch px-6 py-4 leading-5' : ''"
            >
              <p class="text-neutral-700">
                <span class="text-neutral-700" :class="item.discount.value ? 'line-through' : ''">
                  {{ item.initialUnitPrice.toFixed(2) }}
                </span>
                <span class="text-neutral-700"> Lei</span>
              </p>
              <p v-if="item.discount.value" class="mt-1 text-red-500">
                <span class="text-red-500"> {{ item.unitPriceAfterDiscounts.toFixed(2) }}</span>
                <span class="text-red-500">Lei</span>
              </p>
            </div>
            <div class="flex justify-center items-center flex-col text-sm min-w-[86px]">
              <p>{{ item.stock }}</p>
            </div>
            <div class="flex justify-center items-center text-sm min-w-[86px]">
              <span class="flex shrink-0 self-stretch my-auto w-3 h-3 rounded-full bg-emerald-500 mr-1" aria-hidden="true" />
              <p>16</p>
            </div>
            <div class="flex justify-center items-center text-sm min-w-[86px]">
              <span class="flex shrink-0 self-stretch my-auto w-3 h-3 rounded-full bg-emerald-500 mr-1" aria-hidden="true" />
              <p>Paid</p>
            </div>
            <div class="flex justify-center items-end flex-col text-sm min-w-[86px]">
              <p>
                {{ lineVatAmount(item.stock, item.unitPriceAfterDiscounts).toFixed(2) }}
                <span>Lei</span>
              </p>
            </div>
            <div class="flex justify-center flex-col text-sm min-w-[86px] text-end">
              <p>
                {{ (item.stock * item.unitPriceAfterDiscounts).toFixed(2) }}
                <span> Lei</span>
              </p>
            </div>
          </template>
          <template v-else>
            <section class="flex flex-col self-stretch pb-2 max-w-2xl text-sm">
              <article class="flex gap-5 justify-between w-full max-md:flex-wrap max-md:max-w-full">
                <p class="my-auto leading-6 text-neutral-800">Unit Price</p>
                <section class="flex flex-col leading-[143%]">
                  <p class="text-neutral-800 line-through">
                    <span class="leading-5">{{ item.initialUnitPrice.toFixed(2) }}</span>
                    <span class="leading-5 text-neutral-800"> Lei</span>
                  </p>
                  <p v-if="item.discount.value" class="font-medium text-red-500">
                    <span> {{ item.unitPriceAfterDiscounts.toFixed(2) }}</span>
                    <span class="text-red-500">Lei</span>
                  </p>
                </section>
              </article>
              <article
                class="flex gap-5 justify-between mt-1 w-full leading-6 whitespace-nowrap text-neutral-800 max-md:flex-wrap max-md:max-w-full"
              >
                <p>Quantity</p>
                <p>{{ item.stock }}</p>
              </article>
              <article
                v-if="orderType === OrderType.Back"
                class="flex gap-5 justify-between mt-1 w-full leading-6 whitespace-nowrap text-neutral-800 max-md:flex-wrap max-md:max-w-full"
              >
                <p>Delivered</p>
                <p class="flex gap-1">
                  <span class="flex shrink-0 self-stretch my-auto w-3 h-3 rounded-full bg-emerald-500 mr-1" aria-hidden="true" />
                  {{ item.backorder_stock }}
                </p>
              </article>
              <article
                v-if="orderType === OrderType.Back"
                class="flex gap-5 justify-between mt-1 w-full leading-6 whitespace-nowrap text-neutral-800 max-md:flex-wrap max-md:max-w-full"
              >
                <p>Payment Status</p>
                <p class="flex gap-1">
                  <span class="flex shrink-0 self-stretch my-auto w-3 h-3 rounded-full bg-emerald-500 mr-1" aria-hidden="true" />
                  Paid
                </p>
              </article>
              <article class="flex gap-5 justify-between mt-1 w-full leading-6 text-neutral-800 max-md:flex-wrap max-md:max-w-full">
                <p>Tax (VAT {{ vatPercent }}%)</p>
                <p>{{ lineVatAmount(item.stock, item.unitPriceAfterDiscounts).toFixed(2) }} Lei</p>
              </article>
              <article
                class="flex gap-5 justify-between mt-1 w-full leading-6 whitespace-nowrap text-neutral-800 max-md:flex-wrap max-md:max-w-full"
              >
                <p>Subtotal</p>
                <p>
                  {{ lineSubtotalWithVat(item.stock, item.unitPriceAfterDiscounts).toFixed(2) }}
                  Lei
                </p>
              </article>
            </section>
          </template>
        </div>
      </div>
      <div v-if="orderType === OrderType.Mixed">
        <UiSeparator class="bg-light-500" />
        <div class="flex flex-col gap-4 w-full">
          <header class="w-full text-sm font-semibold leading-6 text-neutral-700">
            {{ type + ' Order Payment Summary' }}
          </header>
          <section class="flex flex-col gap-2">
            <div class="flex gap-2 justify-between w-full text-sm font-medium leading-6">
              <div class="text-gray-500">Subtotal</div>
              <div class="text-neutral-700">{{ payment.subtotal.toFixed(2) }} Lei</div>
            </div>
            <div v-if="payment.discountAmount" class="flex gap-2 justify-between w-full text-sm leading-6">
              <div class="flex gap-5 justify-between whitespace-nowrap">
                <div class="font-medium text-gray-500">Discount</div>
                <div class="text-neutral-700">{{ payment.discountRate.toFixed(2) }}%</div>
              </div>
              <div class="font-medium text-neutral-700">{{ payment.discountAmount }} Lei</div>
            </div>
            <div class="flex gap-5 text-sm leading-6">
              <div class="flex flex-col md:flex-row justify-between md:justify-start w-full gap-2 font-medium text-gray-500">
                <div class="flex gap-2">
                  Handling Charge
                  <InfoIcon class="shrink-0 my-auto w-4 aspect-square text-slate-500" />
                </div>
                <div>Small order charge</div>
              </div>
              <div class="flex justify-end text-neutral-700 font-medium min-w-12 w-full">{{ payment.handlingCharge.toFixed(2) }} Lei</div>
            </div>
            <div class="flex gap-5 text-sm leading-6">
              <div class="flex flex-col md:flex-row justify-between md:justify-start w-full gap-2 font-medium text-gray-500">
                <div class="flex gap-2">
                  Shipping
                  <InfoIcon class="shrink-0 my-auto w-4 aspect-square text-slate-500" />
                </div>
                <div>{{ shippingMethod?.title }}</div>
              </div>
              <div class="flex justify-end text-neutral-700 font-medium min-w-12 w-full">{{ payment.shippingCost || 0 }} Lei</div>
            </div>
            <div class="flex gap-2 justify-between w-full text-sm leading-6">
              <div class="flex gap-5 justify-between whitespace-nowrap">
                <div class="flex gap-2 font-medium text-gray-500">
                  <div>Tax:</div>
                  <InfoIcon class="shrink-0 my-auto w-4 aspect-square text-slate-500" />
                </div>
                <div class="text-neutral-700">({{ payment.taxRate }}%)</div>
              </div>
              <div class="font-medium text-neutral-700">{{ payment.taxAmount.toFixed(2) }} Lei</div>
            </div>
            <UiSeparator class="bg-light-500" />
            <div class="flex gap-2 justify-between mt-2 w-full text-neutral-700">
              <div class="text-xl leading-9">
                {{ type + ' Order Total' }}
              </div>
              <div class="text-2xl font-semibold leading-9">{{ payment.stockOrderTotal.toFixed(2) }} Lei</div>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped></style>
