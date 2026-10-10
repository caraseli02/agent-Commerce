<template>
  <div class="flex min-w-[106px] items-center">
    <span :class="status?.badge?.bg" class="h-4 w-4 mr-2 rounded-full text-xs text-white flex justify-center items-center">
      {{ status?.badge?.text }}
    </span>
    {{ status?.label || 'Unknown Type' }}
  </div>
</template>

<script setup lang="ts">
import type { AccountType } from '~~/types';
import { getCustomerTypeInfo } from '~/components/admin-table/customer/options';

const props = defineProps<{
  type: AccountType;
}>();

const status = computed(() => {
  const accountTypeInfo = getCustomerTypeInfo(props.type);
  return accountTypeInfo || null; // Handle potential null value
});
</script>
