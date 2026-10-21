<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div class="flex flex-col gap-1.5 sm:col-span-2">
      <UiLabel :for="`${addressType}-line-1`">Address line 1</UiLabel>
      <UiInput
        :id="`${addressType}-line-1`"
        :model-value="modelValue.name1"
        placeholder="123 Market Street"
        autocomplete="address-line1"
        @update:model-value="updateField('name1', $event)"
      />
    </div>
    <div class="flex flex-col gap-1.5 sm:col-span-2">
      <UiLabel :for="`${addressType}-line-2`">Address line 2 (optional)</UiLabel>
      <UiInput
        :id="`${addressType}-line-2`"
        :model-value="modelValue.name2 || ''"
        placeholder="Apt 4B"
        autocomplete="address-line2"
        @update:model-value="updateField('name2', $event)"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <UiLabel :for="`${addressType}-city`">City</UiLabel>
      <UiInput
        :id="`${addressType}-city`"
        :model-value="modelValue.city"
        placeholder="San Francisco"
        autocomplete="address-level2"
        @update:model-value="updateField('city', $event)"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <UiLabel :for="`${addressType}-region`">Region / State</UiLabel>
      <UiInput
        :id="`${addressType}-region`"
        :model-value="modelValue.region"
        placeholder="California"
        autocomplete="address-level1"
        @update:model-value="updateField('region', $event)"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <UiLabel :for="`${addressType}-postcode`">Postcode</UiLabel>
      <UiInput
        :id="`${addressType}-postcode`"
        :model-value="modelValue.postcode"
        placeholder="94105"
        autocomplete="postal-code"
        @update:model-value="updateField('postcode', $event)"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <UiLabel :for="`${addressType}-country`">Country</UiLabel>
      <UiInput
        :id="`${addressType}-country`"
        :model-value="modelValue.country"
        placeholder="US"
        autocomplete="country"
        @update:model-value="updateField('country', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShippingAddressInterface } from '~~/types/auth/user-interface';

const props = defineProps<{
  modelValue: ShippingAddressInterface;
  addressType: 'shipping' | 'billing';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ShippingAddressInterface];
}>();

const updateField = (field: keyof ShippingAddressInterface, value: string | number) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: String(value),
  });
};
</script>
