<template>
  <div class="relative flex flex-col bg-white rounded-xl p-4 shadow-xs md:p-6">
    <div class="flex items-center justify-between" :class="[emptyData || error ? 'mb-[93px] md:mb-[85px]' : 'mb-6']">
      <div class="leading-normal font-semibold">Recent Transactions</div>
      <WarningIcon v-if="error" class="w-6 h-6" />
    </div>
    <div v-if="emptyData || error" class="flex flex-col items-center justify-center flex-1 mb-[69px] md:mb-[61px]">
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium text-gray-500">No data available</div>
    </div>
    <template v-else>
      <div class="mb-5">
        <div class="grid grid-cols-[repeat(2,1fr)_20px] gap-4 bg-[#F2F2F2] rounded px-2 py-1 text-sm font-medium leading-[1.57] mb-2">
          <div>Amount</div>
          <div>Status</div>
          <div />
        </div>
        <div
          v-for="(transaction, index) in recentTransactionArray"
          :key="index"
          class="grid grid-cols-[repeat(2,1fr)_20px] gap-4 text-sm font-medium pb-2 last:pb-0"
          :class="[isLoading ? '' : 'px-2']"
        >
          <SkeletonLoader v-if="isLoading" class="w-full h-5" />
          <div v-else>
            {{ transaction.amount }}
          </div>
          <SkeletonLoader v-if="isLoading" class="w-full h-5 col-span-2" />
          <template v-else>
            <div class="flex items-center">
              <div
                class="w-2 h-2 rounded-full mr-2"
                :class="[
                  transaction.status === 'success' ? 'bg-[#00D395]' : transaction.status === 'declined' ? 'bg-rose-500' : 'bg-[#FF8A00]',
                ]"
              />
              <span
                class="capitalize font-medium"
                :class="[
                  transaction.status === 'success'
                    ? 'text-[#00D395]'
                    : transaction.status === 'declined'
                      ? 'text-rose-500'
                      : 'text-[#FF8A00]',
                ]"
                >{{ transaction.status }}</span
              >
            </div>
            <div>
              <ArrowSquareRightIcon class="w-5 h-5" />
            </div>
          </template>
        </div>
      </div>
      <div class="flex items-center justify-center">
        <button disabled class="flex items-center disabled:cursor-not-allowed disabled:opacity-60">
          <span class="text-sm font-medium left-[1.43] text-slate-500 mr-2">
            <span class="md:hidden lg:inline-block"> View </span> more
          </span>
          <ArrowRightIcon class="w-4 h-4" />
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import ArrowRightIcon from '@/assets/icons/dashboard/arrow-right.svg';
import ArrowSquareRightIcon from '@/assets/icons/dashboard/arrow-square-right.svg';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import { fetchCustomerRecentTransactions } from '~/composables/api/customer-profile';
import { getPaymentStatusById, unknownPaymentStatusLabel } from '~/types/order-summary/item';
import type { TransactionInterface } from '~/types/dashboard/transaction';

const error = ref(false);
const emptyData = ref(false);
const isLoading = ref(true);
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});
const recentTransactions = ref<TransactionInterface[]>({} as TransactionInterface[]);

interface OrderInfo {
  amount: string;
  status: string;
}

const recentTransactionArray: OrderInfo[] = [];

const fetchRecentTransactions = async () => {
  error.value = false;
  isLoading.value = true;
  if (!props.id) {
    return;
  }
  const response = await fetchCustomerRecentTransactions(props.id);

  if (response.status !== 'success' || !Array.isArray(response.data)) {
    isLoading.value = false;
    error.value = true;

    return;
  } else {
    isLoading.value = false;
  }

  recentTransactions.value = response.data;

  recentTransactions.value?.map((transaction, _index) => {
    const transactionInfo = {} as OrderInfo;

    transactionInfo.amount = `${transaction.amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Lei`;
    transactionInfo.status = getPaymentStatusById(transaction.status) ?? unknownPaymentStatusLabel;
    recentTransactionArray.push(transactionInfo);
  });
};

await fetchRecentTransactions();
</script>
