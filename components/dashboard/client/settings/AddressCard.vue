<script lang="ts" setup>
import { Building2, CheckCircle, FilePenLineIcon, Trash2Icon } from 'lucide-vue-next';

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

const props = defineProps<{
  addressData: AddressData;
}>();

const emit = defineEmits<{
  (e: 'setDefault', address: AddressData): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'edit', address: AddressData): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'delete', address: AddressData): void;
}>();

const editAddress = () => {
  emit('edit', props.addressData);
};

const deleteAddress = () => {
  emit('delete', props.addressData);
};

const setDefault = () => {
  emit('setDefault', props.addressData);
};
</script>

<template>
  <article class="flex flex-col justify-center self-stretch p-4 rounded-xl border border-dashed border-neutral-300">
    <div class="flex gap-4 justify-between w-full max-md:flex-wrap max-md:max-w-full">
      <div class="flex gap-4 max-md:flex-wrap">
        <Building2 class="shrink-0 my-auto w-8 aspect-square stroke-1" />
        <!-- <img :src="addressData.icon" :alt="addressData.alias" class="shrink-0 my-auto w-8 aspect-square" /> -->
        <div class="flex flex-col max-md:max-w-full">
          <div class="flex gap-5 max-md:flex-wrap">
            <h2 class="text-base font-semibold leading-6 text-neutral-800">
              {{ addressData.alias }}
            </h2>
            <div
              v-if="addressData.default"
              class="max-w-20 max-h-6 hidden md:flex items-center gap-1 justify-center px-2 py-1 text-xs font-medium leading-4 text-white whitespace-nowrap bg-emerald-500 rounded-full"
            >
              <CheckCircle class="shrink-0 w-4 h-4 aspect-square" />
              <span>Default</span>
            </div>
          </div>
          <p class="mt-2 text-sm leading-5 text-gray-500 max-md:max-w-full">
            {{ addressData.name }}
          </p>
          <p class="mt-2 text-sm leading-5 text-gray-500 max-md:max-w-full">
            {{ addressData.address }}
          </p>
          <p class="mt-2 text-sm leading-5 text-gray-500 max-md:max-w-full">
            {{ addressData.phone }}
          </p>
        </div>
      </div>
      <div class="flex gap-4 my-auto">
        <div class="flex-1 my-auto">
          <div
            v-if="addressData.default"
            class="md:hidden max-w-20 max-h-6 flex items-center gap-1 justify-center px-2 py-1 text-xs font-medium leading-4 text-white whitespace-nowrap bg-emerald-500 rounded-[100px]"
          >
            <CheckCircle class="shrink-0 w-4 h-4 aspect-square" />
            <span>Default</span>
          </div>
        </div>
        <UiButton
          v-if="!addressData.default"
          size="icon"
          class="rounded-full"
          aria-label="Edit address"
          variant="secondary"
          @click="setDefault"
        >
          <CheckCircle class="w-5 aspect-square" />
        </UiButton>
        <UiButton size="icon" class="rounded-full" aria-label="Edit address" variant="secondary" @click="editAddress">
          <FilePenLineIcon class="w-5 aspect-square" />
        </UiButton>
        <UiButton size="icon" class="rounded-full" aria-label="Delete address" variant="secondary" @click="deleteAddress">
          <Trash2Icon class="w-5 aspect-square" />
        </UiButton>
      </div>
    </div>
  </article>
</template>
