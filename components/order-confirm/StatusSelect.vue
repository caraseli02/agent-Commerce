<template>
  <UiSelect v-model:model-value="selected" :default-value="defaultValue.value">
    <UiSelectTrigger class="w-[150px] h-8">
      <UiSelectValue placeholder="Order Status" />
    </UiSelectTrigger>
    <UiSelectContent>
      <UiSelectGroup>
        <UiSelectItem v-for="status in statuses" :key="status.value" class="p-2 focus:bg-light-300" :value="status.value">
          <div class="flex items-center gap-2">
            <p class="w-3 h-3 rounded-full" :class="status.color" />
            {{ status.label }}
          </div>
        </UiSelectItem>
      </UiSelectGroup>
    </UiSelectContent>
  </UiSelect>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="border-none shadow-s max-w-[348px] md:max-w-[440px] rounded-xl">
      <section class="flex flex-col gap-12 justify-center bg-white">
        <header class="flex flex-col justify-center w-full">
          <div class="flex gap-10 justify-between items-center w-full">
            <h1 class="self-stretch my-auto text-base font-semibold leading-7 text-zinc-800">Order Status Update</h1>
          </div>
          <div class="flex flex-col self-center mt-12">
            <p class="self-start text-sm leading-none text-center text-zinc-800">You are about to change the status for:</p>
            <div class="flex gap-4 items-center mt-4 text-2xl leading-none">
              <span class="self-stretch my-auto text-gray-500"> Order ID: </span>
              <strong class="self-stretch my-auto font-medium text-zinc-800"> S-241030007 </strong>
            </div>
          </div>
        </header>
        <footer class="flex gap-2 md:justify-end items-center mt-12 w-full text-sm font-medium leading-none whitespace-nowrap">
          <UiButton class="min-w-24" variant="secondary" @click="cancelChange"> Cancel </UiButton>
          <UiButton class="w-full min-w-32 md:w-fit" @click="confirmChange"> Confirm </UiButton>
        </footer>
      </section>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useNuxtApp } from '#app';
import { toast } from '~/components/ui/toast';

const { $api } = useNuxtApp();

const props = defineProps<{
  orderId: string;
  defaultValue: { value: string; label: string; color: string };
  statuses: { value: string; label: string; color: string }[];
}>();

const selected = ref();
const isOpen = ref(false);
const previousValue = ref();
let isCanceling = false;

// Watch for status change
watch(selected, (newValue, oldVal) => {
  if (isCanceling) {
    isCanceling = false;
    return; // Skip opening dialog when canceling
  }
  previousValue.value = oldVal; // Store the old value for canceling
  isOpen.value = true;
});

// Confirm change
const confirmChange = async () => {
  isOpen.value = false; // Close dialog

  const result = (await $api.orders.changeStatus(props.orderId, selected.value)) as unknown as {
    status: string;
    description: string;
  };
  if (result.status !== 'success') {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: result.description || 'Failed to update order status',
    });
    return;
  }

  toast({
    variant: 'success',
    title: 'Success',
    description: 'Order status updated successfully',
  });
};

// Cancel change
const cancelChange = () => {
  isCanceling = true;
  selected.value = previousValue.value; // Revert to previous value
  isOpen.value = false; // Close dialog
};
</script>

<style scoped></style>
