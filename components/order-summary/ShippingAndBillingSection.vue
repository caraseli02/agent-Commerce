<template>
  <div class="flex flex-col gap-6 sm:flex-row sm:gap-8 lg:flex-col lg:gap-6 mt-6 mb-2 justify-between">
    <OrderSummaryGuestCheckoutAddressForm v-if="isGuestMode" :order="order" />

    <template v-else>
      <div class="flex flex-col gap-4 w-full">
        <div class="flex flex-row justify-between">
          <div class="flex flex-row items-center gap-3">
            <span class="text-neutral-700 text-sm font-medium leading-6">Billing Information</span>
            <DemoTooltip v-if="billingInfoMissing" theme="black" position="top">
              <WarningErrorYellow />
              <template #content>
                <span class="capitalize">Missing Info</span>
              </template>
            </DemoTooltip>
            <GreenCheckCircle v-else-if="hasBillingAddress" />
          </div>
          <div v-if="hasBillingAddress" class="flex flex-row gap-4">
            <DemoTooltip theme="black" position="top">
              <button type="button">
                <EditSmall
                  class="text-[#5E6278] hover:text-[#007FFF] transition duration-150"
                  @click="router.push('/dashboard/client?tab=settings')"
                />
              </button>
              <template #content>
                <span class="capitalize">Edit</span>
              </template>
            </DemoTooltip>
          </div>
        </div>

        <div
          v-if="!hasBillingAddress"
          class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          data-testid="billing-missing-empty"
        >
          <p class="font-medium">No billing address saved</p>
          <p class="mt-1 text-xs opacity-90">
            <NuxtLink to="/dashboard/client?tab=settings" class="font-semibold underline hover:text-amber-950"
              >Add a billing address</NuxtLink
            >
            in your account settings to continue checkout.
          </p>
        </div>
        <div v-else class="flex flex-col gap-2">
          <p class="text-[#5E6278] text-sm font-medium leading-5">
            {{ order.shippingDetails?.billingAddress?.name1 }}
          </p>
          <p class="text-[#5E6278] text-sm font-medium leading-5">
            {{ order.shippingDetails?.billingAddress?.city }}, {{ order.shippingDetails?.billingAddress?.region }}
          </p>
          <p class="text-[#5E6278] text-sm font-medium leading-5">
            {{ order.shippingDetails?.billingAddress?.postcode }},
            {{ order.shippingDetails?.billingAddress?.country }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-4 w-full">
        <div class="flex flex-row justify-between">
          <div class="flex flex-row items-center gap-3">
            <span class="text-neutral-700 text-sm font-medium leading-6">Shipping Information</span>
            <DemoTooltip v-if="shippingInfoMissing" theme="black" position="top">
              <WarningErrorYellow />
              <template #content>
                <span class="capitalize">Missing Info</span>
              </template>
            </DemoTooltip>
            <GreenCheckCircle v-else-if="hasShippingAddress" />
          </div>
          <div v-if="hasShippingAddress" class="flex flex-row gap-4">
            <DemoTooltip theme="black" position="top">
              <button type="button">
                <EditSmall
                  class="text-[#5E6278] hover:text-[#007FFF] transition duration-150"
                  @click="router.push('/dashboard/client?tab=settings')"
                />
              </button>
              <template #content>
                <span class="capitalize">Edit</span>
              </template>
            </DemoTooltip>
          </div>
        </div>

        <div
          v-if="!hasShippingAddress"
          class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          data-testid="shipping-missing-empty"
        >
          <p class="font-medium">No shipping address saved</p>
          <p class="mt-1 text-xs opacity-90">
            <NuxtLink to="/dashboard/client?tab=settings" class="font-semibold underline hover:text-amber-950"
              >Add a shipping address</NuxtLink
            >
            in your account settings to continue checkout.
          </p>
        </div>
        <div v-else class="flex flex-col gap-2">
          <div class="flex flex-row justify-between">
            <span class="text-neutral-700 text-sm font-medium leading-6">{{ order.shippingDetails?.address?.alias }}</span>
            <div
              v-if="order.shippingDetails?.address?.default"
              class="px-2 py-1 rounded-[100px] border-[1px] border-[#00D395] flex items-center justify-center gap-1"
            >
              <CheckCircleSmall />
              <span class="text-[#00D395] text-xs font-medium leading-4">Default</span>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <p class="text-[#5E6278] text-sm font-medium leading-5">
              {{ order.shippingDetails?.address?.name1 }}
            </p>
            <p class="text-[#5E6278] text-sm font-medium leading-5">
              {{ order.shippingDetails?.address?.city }}, {{ order.shippingDetails?.address?.region }}
            </p>
            <p class="text-[#5E6278] text-sm font-medium leading-5">
              {{ order.shippingDetails?.address?.postcode }}, {{ order.shippingDetails?.address?.country }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import GreenCheckCircle from '@/assets/icons/green-check-circle.svg';
import EditSmall from '@/assets/icons/edit-small.svg';
import CheckCircleSmall from '@/assets/icons/check-circle-small.svg';
import WarningErrorYellow from '@/assets/icons/warning-error-yellow.svg';
import { isCompleteSavedAddress } from '~/helpers/address.helper';
import type { CheckoutOrderDraft } from '~/types';

const props = defineProps<{
  order: CheckoutOrderDraft;
  isGuestMode?: boolean;
}>();

const router = useRouter();

const hasBillingAddress = computed(() => isCompleteSavedAddress(props.order.shippingDetails?.billingAddress));
const hasShippingAddress = computed(() => isCompleteSavedAddress(props.order.shippingDetails?.address));

const billingInfoMissing = computed(() => !hasBillingAddress.value);
const shippingInfoMissing = computed(() => !hasShippingAddress.value);
</script>
