<template>
  <div class="flex flex-col gap-6">
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="guest-contact-form">
      <p class="text-sm font-medium text-neutral-700">Contact information</p>
      <p class="mt-1 text-xs text-slate-500">We will use this to send order updates.</p>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-neutral-600" for="guest-first-name">First name</label>
          <UiInput id="guest-first-name" v-model="contact.firstName" placeholder="Jane" autocomplete="given-name" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-neutral-600" for="guest-last-name">Last name</label>
          <UiInput id="guest-last-name" v-model="contact.lastName" placeholder="Doe" autocomplete="family-name" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-neutral-600" for="guest-email">Email</label>
          <UiInput id="guest-email" v-model="contact.email" type="email" placeholder="jane@example.com" autocomplete="email" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-neutral-600" for="guest-phone">Phone</label>
          <UiInput id="guest-phone" v-model="contact.phone" type="tel" placeholder="+1 555 0100" autocomplete="tel" />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4" data-testid="guest-shipping-form">
      <p class="text-sm font-medium text-neutral-700">Shipping address</p>
      <GuestAddressFields v-model="shippingAddress" address-type="shipping" />
    </div>

    <div class="flex flex-col gap-4" data-testid="guest-billing-form">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-neutral-700">Billing address</p>
        <label class="flex items-center gap-2 text-xs text-slate-600">
          <UiCheckbox :checked="billingSameAsShipping" @update:checked="billingSameAsShipping = $event" />
          Same as shipping
        </label>
      </div>
      <GuestAddressFields v-if="!billingSameAsShipping" v-model="billingAddress" address-type="billing" />
      <p v-else class="text-xs text-slate-500">Billing address will match your shipping address.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CheckoutOrderDraft } from '~~/types';
import type { ShippingAddressInterface } from '~~/types/auth/user-interface';
import GuestAddressFields from '~/components/order-summary/GuestAddressFields.vue';
import { createEmptyGuestAddress } from '~~/helpers/address.helper';

const props = defineProps<{
  order: CheckoutOrderDraft;
}>();

const contact = computed({
  get: () =>
    props.order.guestContact ?? {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  set: (value) => {
    // eslint-disable-next-line vue/no-mutating-props
    props.order.guestContact = value;
  },
});

const shippingAddress = computed({
  get: () => props.order.shippingDetails.address ?? createEmptyGuestAddress('Shipping'),
  set: (value: ShippingAddressInterface) => {
    // eslint-disable-next-line vue/no-mutating-props
    props.order.shippingDetails.address = value;
  },
});

const billingAddress = computed({
  get: () => props.order.shippingDetails.billingAddress ?? createEmptyGuestAddress('Billing'),
  set: (value: ShippingAddressInterface) => {
    // eslint-disable-next-line vue/no-mutating-props
    props.order.shippingDetails.billingAddress = value;
  },
});

const billingSameAsShipping = ref(true);

watch(
  billingSameAsShipping,
  (sameAsShipping) => {
    if (sameAsShipping) {
      billingAddress.value = {
        ...shippingAddress.value,
        alias: 'Billing',
      };
    }
  },
  { immediate: true },
);

watch(
  shippingAddress,
  (nextShipping) => {
    if (!billingSameAsShipping.value) {
      return;
    }

    billingAddress.value = {
      ...nextShipping,
      alias: 'Billing',
    };
  },
  { deep: true },
);
</script>
