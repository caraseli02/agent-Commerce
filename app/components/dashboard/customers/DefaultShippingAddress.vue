<template>
  <div class="bg-white rounded-xl p-4 shadow-xs md:p-6">
    <div class="flex items-center justify-between" :class="[emptyData || error ? 'mb-4' : 'mb-6']">
      <div class="text-sm font-semibold">Default Shipping Address</div>
      <div v-if="!error" class="relative">
        <UiButton
          variant="ghost"
          size="icon"
          class="flex h-auto w-auto"
          aria-label="Open shipping address menu"
          @click="showOptions = !showOptions"
        >
          <DotsVerticalIcon class="w-6 h-6 text-[#9296AA] transition-colors duration-300 hover:text-blue-500" />
        </UiButton>
        <Transition name="fade-full">
          <div
            v-if="showOptions"
            v-click-outside="() => (showOptions = false)"
            class="absolute -bottom-3.5 right-0 translate-y-full grid grid-cols-1 gap-1 w-full rounded-lg bg-white p-3 min-w-[154px] shadow-m"
          >
            <UiButton
              variant="ghost"
              disabled
              class="flex h-auto justify-start w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:text-blue-500 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              <EyeIcon class="w-6 h-6 mr-3 text-current" />
              <span class="text-sm leading-[1.71] font-medium"> View All </span>
            </UiButton>
            <UiButton
              variant="ghost"
              disabled
              class="flex h-auto justify-start w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:text-blue-500 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              <EditIcon class="w-6 h-6 mr-3 text-current" />
              <span class="text-sm leading-[1.71] font-medium"> Edit </span>
            </UiButton>
          </div>
        </Transition>
      </div>
      <WarningIcon v-else class="w-6 h-6" />
    </div>
    <div v-if="emptyData || error" class="flex items-center md:justify-center">
      <EmojiSadIcon class="w-[52px] h-[52px] mr-4" />
      <div class="text-sm font-medium text-gray-500">No data available</div>
    </div>
    <div v-else class="flex items-start">
      <BusinessIcon class="w-11 h-11 text-[#00D395] flex-shrink-0 mr-4" />
      <SkeletonLoader v-if="isLoading" class="w-full h-16 md:h-11" />
      <div v-else>
        <div class="text-sm font-semibold mb-1">
          {{ shippingInformation?.find((x) => x.default)?.name1 || 'N/A' }}
        </div>
        <div class="text-sm">
          {{ shippingInformation?.find((x) => x.default)?.name2 || 'N/A' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DotsVerticalIcon from '@/assets/icons/dots-vertical.svg';
import BusinessIcon from '@/assets/icons/dashboard/business-lg.svg';
import EyeIcon from '@/assets/icons/dashboard/eye.svg';
import EditIcon from '@/assets/icons/dashboard/edit.svg';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import { fetchCustomerShippingInformation } from '~/composables/api/customer-profile';
import type { ShippingAddressInterface } from '~~/types/auth/user-interface';

const showOptions = ref(false);

const error = ref(false);
const emptyData = ref(false);
const isLoading = ref(true);

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const shippingInformation = ref([] as ShippingAddressInterface[]);
const fetchShippingInformation = async () => {
  error.value = false;
  isLoading.value = true;
  if (!props.id) {
    return;
  }
  const response = (await fetchCustomerShippingInformation(props.id)) as {
    status: string;
    data: ShippingAddressInterface[];
  };

  if (response.status !== 'success') {
    isLoading.value = false;
    error.value = true;

    return;
  } else {
    isLoading.value = false;
  }

  shippingInformation.value = response.data;
};
await fetchShippingInformation();
</script>
