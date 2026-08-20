<template>
  <div class="flex flex-col bg-white rounded-xl p-4 shadow-xs md:p-6 xl:pt-10 xl:shadow-none xl:rounded-none">
    <div class="mb-4">
      <div class="flex items-start justify-between">
        <h2 class="text-xl leading-[1.4] font-semibold">Customer Discount</h2>
        <SkeletonLoader v-if="loading" class="w-[60px] h-7" />
        <WarningIcon v-else-if="error" class="w-6 h-6" />
        <div v-else class="flex text-white bg-blue-500 text-xs leading-[1.66] font-semibold rounded-full px-2">
          {{ customerDiscount + '%' }}
        </div>
      </div>
    </div>
    <p class="text-sm leading-[1.71] mb-9">Apply a customer discount (i.e. 5, 10, 17 etc).</p>
    <div class="mb-9">
      <SkeletonLoader v-if="loading" class="w-full h-[68px]" />
      <template v-else>
        <div class="text-sm text-slate-500 mb-1">Customer Discount</div>
        <div class="flex border border-border rounded-lg h-11 overflow-hidden">
          <div class="text-xl leading-[1.3] px-3 py-2 border-r border-border bg-[#F5F5F5]">%</div>
          <input
            v-model="customerDiscountBuffer"
            type="number"
            placeholder="Discount (i.e. 5, 10, 17)"
            class="bg-transparent px-2 text-sm w-full transition-colors duration-300 focus:outline-none"
          />
        </div>
      </template>
    </div>
    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] lg:grid-cols-1 lg:mt-auto"
      :class="[error || loading ? ' opacity-0 pointer-events-none' : '']"
    >
      <button
        v-if="customerDiscount"
        class="flex items-center justify-center w-full border-[1.5px] border-[#FA4B4B] rounded-lg px-5 py-2 text-rose-500 h-11"
        @click="
          customerDiscount = 0;
          customerDiscountBuffer = 0;
          updateDiscount(0);
        "
      >
        <TrashIcon class="w-6 h-6 mr-2" />
        <span class="leading-[1.71] font-medium"> Cancel Discount </span>
      </button>
      <button
        class="flex items-center justify-center w-full bg-blue-500 rounded-lg px-5 py-2 text-white h-11"
        @click="
          customerDiscount = customerDiscountBuffer;
          updateDiscount(customerDiscountBuffer);
        "
      >
        <PercentageIcon class="w-6 h-6 mr-2" />
        <span class="leading-[1.71] font-medium"> {{ customerDiscount ? 'Update' : 'Apply' }} Discount </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import TrashIcon from '@/assets/icons/dashboard/trash.svg';
import PercentageIcon from '@/assets/icons/dashboard/percentage.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import { useControlPanel } from '~/composables/useControlPanel';

const { loadCustomerDiscount, saveCustomerDiscount } = useControlPanel();

const customerDiscountBuffer = ref<number>(0);
const customerDiscount = ref<number>(0);
const loading = ref(true);
const error = ref(false);
const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});
const getCustomerSettings = async () => {
  if (!props.id) {
    return;
  }
  try {
    const discount = await loadCustomerDiscount(props.id);

    if (discount === null && !isMockMode.value) {
      error.value = true;
      loading.value = false;
      return;
    }

    loading.value = false;
    error.value = false;
    const resolvedDiscount = discount ?? 10;
    customerDiscount.value = resolvedDiscount;
    customerDiscountBuffer.value = resolvedDiscount;
  } catch (caughtError) {
    console.error('Failed to load customer discount', caughtError);
    loading.value = false;
    error.value = !isMockMode.value;

    if (isMockMode.value) {
      customerDiscount.value = 10;
      customerDiscountBuffer.value = 10;
    }
  }
};
const updateDiscount = async (discount: number | 0) => {
  if (!props.id) {
    return;
  }
  if (isMockMode.value) {
    loading.value = false;
    error.value = false;
    return;
  }
  const saved = await saveCustomerDiscount(discount, props.id);

  if (!saved) {
    return;
  } else {
    loading.value = false;
    error.value = false;
  }
};

await getCustomerSettings();
</script>
