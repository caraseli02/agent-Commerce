<template>
  <div class="flex flex-col gap-6">
    <div class="rounded-xl border border-border bg-muted p-4" data-testid="guest-contact-form">
      <p class="text-sm font-medium text-foreground">Contact information</p>
      <p class="mt-1 text-xs text-muted-foreground">We will use this to send order updates.</p>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <UiLabel for="guest-first-name">First name</UiLabel>
          <UiInput id="guest-first-name" v-model="contact.firstName" placeholder="Jane" autocomplete="given-name" />
        </div>
        <div class="flex flex-col gap-1.5">
          <UiLabel for="guest-last-name">Last name</UiLabel>
          <UiInput id="guest-last-name" v-model="contact.lastName" placeholder="Doe" autocomplete="family-name" />
        </div>
        <div class="flex flex-col gap-1.5">
          <UiLabel for="guest-email">Email</UiLabel>
          <UiInput id="guest-email" v-model="contact.email" type="email" placeholder="jane@example.com" autocomplete="email" />
        </div>
        <div class="flex flex-col gap-1.5">
          <UiLabel for="guest-phone">Phone</UiLabel>
          <UiInput id="guest-phone" v-model="contact.phone" type="tel" placeholder="+1 555 0100" autocomplete="tel" />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4" data-testid="guest-shipping-form">
      <p class="text-sm font-medium text-foreground">Shipping address</p>
      <GuestAddressFields v-model="shippingAddress" address-type="shipping" />
    </div>

    <div class="flex flex-col gap-4" data-testid="guest-billing-form">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-foreground">Billing address</p>
        <div class="flex items-center gap-2">
          <UiCheckbox
            id="guest-billing-same-as-shipping"
            :checked="billingSameAsShipping"
            @update:checked="billingSameAsShipping = $event"
          />
          <UiLabel for="guest-billing-same-as-shipping">Same as shipping</UiLabel>
        </div>
      </div>
      <GuestAddressFields v-if="!billingSameAsShipping" v-model="billingAddress" address-type="billing" />
      <p v-else class="text-xs text-muted-foreground">Billing address will match your shipping address.</p>
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
