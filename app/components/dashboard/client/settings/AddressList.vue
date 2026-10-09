<script lang="ts" setup>
import type { PropType } from 'vue';
import AddressCard from './AddressCard.vue';

interface AddressData {
  icon: string;
  alias: string;
  default: boolean;
  name: string;
  address: string;
  phone: string;
  _id: string;
  name1: string;
  name2: string;
  city: string;
  country: string;
  postcode: string;
  region: string;
}

const props = defineProps({
  addresses: {
    type: Array as PropType<AddressData[]>,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'edit', address: AddressData): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'delete', address: AddressData): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'set-default', address: AddressData): void;
}>();

const handleEdit = (editedAddress: AddressData) => {
  emit('edit', editedAddress);
};

const handleDelete = (deletedAddress: AddressData) => {
  emit('delete', deletedAddress);
};

const handleSetDefault = (changedAddress: AddressData) => {
  emit('set-default', changedAddress);
};
</script>

<template>
  <div class="space-y-4">
    <AddressCard
      v-for="address in props.addresses"
      :key="address.alias"
      :address-data="address"
      @edit="handleEdit"
      @delete="handleDelete"
      @set-default="handleSetDefault"
    />
  </div>
</template>
