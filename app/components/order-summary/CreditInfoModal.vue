<template>
  <div class="p-3 flex flex-col gap-4 border border-[#D4D4D4] rounded-xl bg-[#FFF] shadow-l">
    <div class="flex flex-row justify-between w-full">
      <span class="text-neutral-700 text-sm font-medium leading-6">Credit Info</span>
      <UiButton variant="ghost" size="icon" class="group inline-flex h-11 w-11 items-center justify-center" aria-label="Credit settings">
        <SettingCog class="text-[#5E6278] transition duration-300 group-hover:text-[#007FFF]" />
      </UiButton>
    </div>
    <div class="flex flex-row gap-6">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Credit Limit</span>
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.limit }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Till Due</span>
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.tillDue }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Credit Term</span>
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.term }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Total Spent</span>
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ formatRegionalPrice(accountCredit.spent) }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Due Date</span>
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ formattedDueDate }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Available</span>
          <span class="text-[#EE514E] text-xs font-medium leading-5">{{ formatRegionalPrice(accountCredit.available) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { formatReviewerDate } from '~~/helpers/reviewer-dates';
import SettingCog from '@/assets/icons/setting-cog.svg';
import type { CustomerCreditInterface } from '~~/types/auth/account-settings';
import { formatRegionalPrice } from '~~/helpers/prices.helper';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

export default defineComponent({
  name: 'CreditInfoModal',
  components: {
    SettingCog,
  },
  props: {
    accountCredit: {
      type: Object as PropType<CustomerCreditInterface>,
      required: true,
    },
  },
  computed: {
    formattedDueDate(this: { accountCredit: CustomerCreditInterface }) {
      return formatReviewerDate(this.accountCredit.dueDate);
    },
  },
  methods: {
    formatRegionalPrice(amount: number) {
      return formatRegionalPrice(amount, useRegionalPreferencesStore().currency?.value);
    },
  },
});
</script>
