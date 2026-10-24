<script setup lang="ts">
import { InfoIcon } from '@lucide/vue';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { OrderType } from '~~/types';
import type { OrderInterface, OrderRequestInterface } from '~~/types';
import { useAuthStore } from '~/store/authStore';
import { toPersistedOrderLineMoneyView } from '~~/helpers/checkout-quote';
import { calculateOrderMoney, DEFAULT_ORDER_VAT_RATE } from '~~/helpers/order-money';
import { resolveOrderLineIdentity } from '~~/helpers/order-line-identity';

const breakpoints = useBreakpoints(breakpointsTailwind);
const lgAndLarger = breakpoints.greaterOrEqual('lg'); // sm and larger

const generalSettings = useAuthStore().generalSettings;

const props = defineProps<{
  data: OrderRequestInterface;
  orderType: OrderType;
}>();

const shippingMethod = computed(() =>
  generalSettings?.orderSettings?.deliveryTypes.find((type) => type._id === backOrder.value.shippingDetails.deliveryTypeId),
);
const type = props.orderType === OrderType.Back ? '' : 'Back';
const backOrderItems = ref(props.data.products || []);
const backOrder = ref(props.data as OrderRequestInterface);
const persistedMoney = computed(() => (backOrder.value as unknown as OrderInterface).money);
const effectiveVatRate = computed(() => persistedMoney.value?.vatRate ?? DEFAULT_ORDER_VAT_RATE);

const payment = computed(() => {
  const subtotal = Number(backOrder.value.subtotal.toFixed(2));
  const discountRate = backOrder.value.discount?.value || 0;
  const smallOrderCharge = backOrder.value.smallOrderCost || 0;
  const shippingType = backOrder.value.shippingCost || 0;
  const fallbackMoney = calculateOrderMoney({ subtotal, discountRate: discountRate / 100, shippingCost: shippingType });
  const discountAmount = (persistedMoney.value?.discountAmount ?? fallbackMoney.discountAmount).toFixed(2);
  const taxRate = Math.round(effectiveVatRate.value * 100);
  const taxAmount = persistedMoney.value?.vatAmount ?? fallbackMoney.vatAmount;
  const total = Number(backOrder.value.total?.toFixed(2));
  return {
    subtotal,
    discountRate,
    discountAmount,
    handlingCharge: persistedMoney.value?.smallOrderCharge ?? smallOrderCharge,
    shippingCost: persistedMoney.value?.shippingCost ?? shippingType,
    taxRate,
    taxAmount,
    backOrderTotal: total, // Include other charges dynamically if needed
  };
});
</script>

<template>
  <div v-if="backOrderItems.length > 0" class="flex flex-col gap-4">
    <p class="flex flex-col gap-2 lg:flex-row">
      <UiBadge class="bg-rose-600 text-white w-fit rounded-md h-7 text-sm"> Back Order </UiBadge>
      <span class="text-rose-500"> {{ backOrderItems.length }} Items will pe placed on Backorder </span>
    </p>
    <section class="flex flex-col gap-10 px-4 py-6 md:p-6 border border-border rounded-xl">
      <div v-if="lgAndLarger" class="flex flex-col lg:flex-row gap-2 lg:gap-4 justify-between self-stretch">
        <span class="hidden lg:inline text-sm font-semibold leading-6 text-foreground w-full max-w-[412px]">Product Details</span>
        <span class="hidden lg:inline text-sm font-semibold leading-6 text-foreground text-center min-w-[86px]">Unit Price</span>
        <span class="hidden lg:inline text-sm font-semibold leading-6 text-foreground text-center min-w-[86px]">Quantity</span>
        <span class="hidden lg:inline text-sm font-semibold leading-6 text-foreground text-center min-w-[86px]">Tax (19%)</span>
        <span class="hidden lg:inline text-sm font-semibold leading-6 text-foreground text-center min-w-[86px]">Subtotal</span>
      </div>
      <div class="flex flex-col gap-6">
        <div
          v-for="item in backOrderItems"
          :key="'stock-' + item.id"
          class="flex flex-col lg:flex-row gap-2 lg:gap-4 justify-between self-stretch border-b last:border-b-0 lg:border-b-0"
        >
          <div class="flex gap-3 lg:mt-6 w-full lg:max-w-[412px]">
            <figure class="flex justify-center items-center h-fit rounded-lg border border-solid border-border">
              <NuxtImg
                :src="item?.productEntity?.details?.ProductImage?.ProductImageSmall"
                alt="Product image"
                class="aspect-square max-h-[60px] min-w-[60px] lg:max-h-[72px] lg:w-[72px] rounded-lg"
                loading="lazy"
              />
            </figure>
            <div class="flex flex-col w-full max-w-[254px] md:max-w-none lg:max-w-[328px]">
              <div class="flex flex-col sm:flex-row sm:gap-2">
                <span class="text-sm font-medium leading-6 text-muted-foreground">Item:</span>
                <div class="flex gap-5 justify-between">
                  <span class="text-sm font-medium leading-6 text-foreground">{{ resolveOrderLineIdentity(item).name || item.id }}</span>
                  <span
                    v-if="item.discount.value"
                    class="justify-center px-2 my-auto text-xs font-semibold leading-5 text-red-500 bg-card rounded-3xl border border-red-500 border-solid"
                  >
                    {{ item.discount.value }} %
                  </span>
                </div>
              </div>
              <div
                v-if="resolveOrderLineIdentity(item).code"
                class="flex flex-col sm:flex-row sm:gap-2 text-sm font-medium leading-6 whitespace-nowrap"
              >
                <span class="text-muted-foreground">Code:</span>
                <span class="text-ellipsis text-foreground w-full max-w-[235px] lg:max-w-[328px] truncate">{{
                  resolveOrderLineIdentity(item).code
                }}</span>
              </div>
              <div
                v-if="resolveOrderLineIdentity(item).description"
                class="flex flex-col sm:flex-row sm:gap-2 text-sm font-medium leading-6 whitespace-nowrap"
              >
                <span class="text-muted-foreground">Description:</span>
                <span class="text-ellipsis text-foreground w-full max-w-[235px] lg:max-w-[328px] truncate">
                  {{ resolveOrderLineIdentity(item).description }}
                </span>
              </div>
              <div
                v-if="resolveOrderLineIdentity(item).manufacturer"
                class="flex flex-col sm:flex-row sm:gap-2 text-sm font-medium leading-6 whitespace-nowrap"
              >
                <span class="text-muted-foreground">Manufacturer:</span>
                <span class="text-ellipsis text-foreground">{{ resolveOrderLineIdentity(item).manufacturer }}</span>
              </div>
            </div>
          </div>
          <template v-if="lgAndLarger">
            <div
              class="flex flex-col p-6 text-sm w-[86px]"
              :class="item.discount.value ? 'justify-center self-stretch px-6 py-4 leading-5' : ''"
            >
              <p class="text-foreground">
                <span class="text-foreground" :class="item.discount.value ? 'line-through' : ''">
                  {{ item.initialUnitPrice.toFixed(2) }}
                </span>
                <span class="font-semibold text-foreground">Lei</span>
              </p>
              <p v-if="item.discount.value" class="mt-1 text-red-500">
                <span class="text-red-500"> {{ item.unitPriceAfterDiscounts.toFixed(2) }}</span>
                <span class="font-semibold text-red-500">Lei</span>
              </p>
            </div>
            <div class="flex flex-col p-6 text-sm">
              <p class="font-semibold">
                {{ item.backorder_stock }}
              </p>
            </div>
            <div class="flex flex-col p-6 text-sm">
              <p v-if="item.backorder_stock">
                {{ toPersistedOrderLineMoneyView(item, effectiveVatRate).vatTotal.toFixed(2) }}
                <span class="font-semibold">Lei</span>
              </p>
            </div>
            <div class="flex flex-col p-6 text-sm">
              <p v-if="item.backorder_stock">
                {{ toPersistedOrderLineMoneyView(item, effectiveVatRate).subtotal.toFixed(2) }}
                <span class="font-semibold">Lei</span>
              </p>
            </div>
          </template>
          <template v-else>
            <section class="flex flex-col self-stretch pb-2 max-w-2xl text-sm">
              <article class="flex gap-5 justify-between w-full max-md:flex-wrap max-md:max-w-full">
                <p class="my-auto leading-6 text-foreground">Unit Price</p>
                <section class="flex flex-col leading-[143%]">
                  <p class="text-foreground line-through">
                    <span class="leading-5">{{ item.initialUnitPrice.toFixed(2) }}</span>
                    <span class="leading-5 text-foreground">Lei</span>
                  </p>
                  <p class="font-medium text-red-500">
                    <span> {{ item.unitPriceAfterDiscounts.toFixed(2) }}</span>
                    <span class="text-red-500">Lei</span>
                  </p>
                </section>
              </article>
              <article
                class="flex gap-5 justify-between mt-1 w-full leading-6 whitespace-nowrap text-foreground max-md:flex-wrap max-md:max-w-full"
              >
                <p>Quantity</p>
                <p>{{ item.stock }}</p>
              </article>
              <article class="flex gap-5 justify-between mt-1 w-full leading-6 text-foreground max-md:flex-wrap max-md:max-w-full">
                <p>Tax (VAT 19%)</p>
                <p v-if="item.backorder_stock">{{ toPersistedOrderLineMoneyView(item, effectiveVatRate).vatTotal.toFixed(2) }} Lei</p>
              </article>
              <article
                class="flex gap-5 justify-between mt-1 w-full leading-6 whitespace-nowrap text-foreground max-md:flex-wrap max-md:max-w-full"
              >
                <p>Subtotal</p>
                <p v-if="item.backorder_stock">{{ toPersistedOrderLineMoneyView(item, effectiveVatRate).subtotal.toFixed(2) }} Lei</p>
              </article>
            </section>
          </template>
        </div>
      </div>
      <div v-if="orderType === OrderType.Mixed">
        <UiSeparator class="bg-accent" />
        <div class="flex flex-col gap-4 w-full">
          <header class="w-full text-sm font-semibold leading-6 text-foreground">
            {{ type + ' Order Payment Summary' }}
          </header>
          <section class="flex flex-col gap-2">
            <div class="flex gap-2 justify-between w-full text-sm font-medium leading-6">
              <div class="text-muted-foreground">Subtotal</div>
              <div class="text-foreground">{{ payment.subtotal.toFixed(2) }} Lei</div>
            </div>
            <div v-if="payment.discountAmount" class="flex gap-2 justify-between w-full text-sm leading-6">
              <div class="flex gap-5 justify-between whitespace-nowrap">
                <div class="font-medium text-muted-foreground">Discount</div>
                <div class="text-foreground">{{ payment.discountRate.toFixed(2) }}%</div>
              </div>
              <div class="font-medium text-foreground">{{ payment.discountAmount }} Lei</div>
            </div>
            <div class="flex gap-5 text-sm leading-6">
              <div class="flex flex-col md:flex-row justify-between md:justify-start w-full gap-2 font-medium text-muted-foreground">
                <div class="flex gap-2">
                  Handling Charge
                  <InfoIcon class="shrink-0 my-auto w-4 aspect-square text-muted-foreground" />
                </div>
                <div>Small order charge</div>
              </div>
              <div class="flex justify-end text-foreground font-medium min-w-12 w-full">{{ payment.handlingCharge.toFixed(2) }} Lei</div>
            </div>
            <div class="flex gap-5 text-sm leading-6">
              <div class="flex flex-1 flex-col md:flex-row justify-between md:justify-start w-full gap-2 font-medium text-muted-foreground">
                <div class="flex gap-2">
                  Shipping
                  <InfoIcon class="shrink-0 my-auto w-4 aspect-square text-muted-foreground" />
                </div>
                <div>{{ shippingMethod?.title }}</div>
              </div>
              <div class="flex justify-end text-foreground font-medium min-w-12 w-fit">{{ payment.shippingCost || 0 }} Lei</div>
            </div>
            <div class="flex gap-2 justify-between w-full text-sm leading-6">
              <div class="flex gap-5 justify-between whitespace-nowrap">
                <div class="flex gap-2 font-medium text-muted-foreground">
                  <div>Tax:</div>
                  <InfoIcon class="shrink-0 my-auto w-4 aspect-square text-muted-foreground" />
                </div>
                <div class="text-foreground">({{ payment.taxRate }}%)</div>
              </div>
              <div class="font-medium text-foreground">{{ payment.taxAmount.toFixed(2) }} Lei</div>
            </div>
            <UiSeparator class="bg-accent" />
            <div class="flex gap-2 justify-between mt-2 w-full text-foreground">
              <div class="text-xl leading-9">
                {{ type + ' Order Total' }}
              </div>
              <div class="text-2xl font-semibold leading-9">{{ payment.backOrderTotal.toFixed(2) }} Lei</div>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped></style>
