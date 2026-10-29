<template>
  <div class="p-3 flex flex-col gap-4 border border-border rounded-xl bg-popover text-popover-foreground shadow-lg">
    <div class="flex flex-row justify-between w-full">
      <span class="text-foreground text-sm font-medium leading-6">Credit Info</span>
      <UiButton variant="ghost" size="icon" class="group inline-flex h-11 w-11 items-center justify-center" aria-label="Credit settings">
        <SettingCog class="text-muted-foreground transition duration-300 group-hover:text-primary" />
      </UiButton>
    </div>
    <div class="flex flex-row gap-6">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-normal leading-5">Credit Limit</span>
          <span class="text-foreground text-xs font-medium leading-5">{{ accountCredit.limit }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-normal leading-5">Till Due</span>
          <span class="text-foreground text-xs font-medium leading-5">{{ accountCredit.tillDue }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-normal leading-5">Credit Term</span>
          <span class="text-foreground text-xs font-medium leading-5">{{ accountCredit.term }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-normal leading-5">Total Spent</span>
          <span class="text-foreground text-xs font-medium leading-5 whitespace-nowrap">{{ accountCredit.spent.toFixed(2) }}&nbsp;Lei</span>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-normal leading-5">Due Date</span>
          <span class="text-foreground text-xs font-medium leading-5">{{ formattedDueDate }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs font-normal leading-5">Available</span>
          <span class="whitespace-nowrap text-foreground text-xs font-medium leading-5"
            >{{ accountCredit.available.toFixed(2) }}&nbsp;Lei</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { formatReviewerDate } from '~~/helpers/reviewer-dates';
import SettingCog from '@/assets/icons/setting-cog.svg';
import type { CustomerCreditInterface } from '~~/types/auth/account-settings';

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
});
</script>
