<template>
  <div class="p-3 flex flex-col gap-4 border border-[#D4D4D4] rounded-xl bg-[#FFF] shadow-l">
    <div class="flex flex-row justify-between w-full">
      <span class="text-neutral-700 text-sm font-medium leading-6">Credit Info</span>
      <button class="group">
        <SettingCog class="text-[#5E6278] group-hover:text-[#007FFF] transition duration-300" />
      </button>
    </div>
    <div class="flex flex-row gap-6">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Credit Limit</span>
          <!-- <span class="text-neutral-700 text-xs font-medium leading-5">€ {{ accountCredit.limit }}</span> -->
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.limit }}</span>
          <!-- placeholder (uncomment the above line) -->
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Till Due</span>
          <!-- <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.tillDue }} Days</span>  -->
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.tillDue }}</span>
          <!-- placeholder (uncomment the above line) -->
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Credit Term</span>
          <!-- <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.term }} Days</span> -->
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.term }}</span>
          <!-- placeholder (uncomment the above line) -->
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Total Spent</span>
          <!-- <span class="text-neutral-700 text-xs font-medium leading-5">€ {{ accountCredit.spent }}</span> -->
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.spent.toFixed(2) }} Lei</span>
          <!-- placeholder (uncomment the above line) -->
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Due Date</span>
          <!-- <span class="text-neutral-700 text-xs font-medium leading-5">{{ accountCredit.dueDate }}</span> -->
          <span class="text-neutral-700 text-xs font-medium leading-5">{{ formattedDueDate }}</span>
          <!-- placeholder (uncomment the above line) -->
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[#5E6278] text-xs font-normal leading-5">Available</span>
          <!-- <span class="text-neutral-700 text-xs font-medium leading-5">€ {{ accountCredit.available }}</span> -->
          <span class="text-[#EE514E] text-xs font-medium leading-5">{{ accountCredit.available.toFixed(2) }} Lei</span>
          <!-- placeholder (uncomment the above line) -->
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { format } from 'date-fns';
import SettingCog from '@/assets/icons/setting-cog.svg';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';

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
    formattedDueDate() {
      return format(new Date(this.accountCredit.dueDate), 'dd MMM yyyy');
    },
  },
});
</script>
