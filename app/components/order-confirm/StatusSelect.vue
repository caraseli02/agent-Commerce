<template>
  <UiSelect v-model:model-value="selected" :default-value="defaultValue.value">
    <UiSelectTrigger class="w-[150px] h-8">
      <UiSelectValue placeholder="Order Status" />
    </UiSelectTrigger>
    <UiSelectContent>
      <UiSelectGroup>
        <UiSelectItem v-for="status in statuses" :key="status.value" class="p-2 focus:bg-accent" :value="status.value">
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
      <section class="flex flex-col gap-12 justify-center bg-card">
        <header class="flex flex-col justify-center w-full">
          <div class="flex gap-10 justify-between items-center w-full">
            <h1 class="self-stretch my-auto text-base font-semibold leading-7 text-foreground">Order Status Update</h1>
          </div>
          <div class="flex flex-col self-center mt-12">
            <p class="self-start text-sm leading-none text-center text-foreground">You are about to change the status for:</p>
            <div class="flex gap-4 items-center mt-4 text-2xl leading-none">
              <span class="self-stretch my-auto text-muted-foreground"> Order ID: </span>
              <strong class="self-stretch my-auto font-medium text-foreground"> S-241030007 </strong>
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
import UiSelectContent from '~/components/ui/select/SelectContent.vue';
import { toast } from '~/components/ui/toast';
import { changeStatus } from '~/composables/api/orders';

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

const statusChangeErrorDescription = (description?: string) =>
  description?.trim() || 'Could not update the order status. Please try again, or refresh the page if it still fails.';

// Confirm change
const confirmChange = async () => {
  isOpen.value = false; // Close dialog

  try {
    const result = await changeStatus(props.orderId, selected.value);
    if (result.status !== 'success') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: statusChangeErrorDescription(result.description),
      });
      return;
    }

    toast({
      variant: 'success',
      title: 'Success',
      description: 'Order status updated successfully',
    });
  } catch {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: statusChangeErrorDescription(),
    });
  }
};

// Cancel change
const cancelChange = () => {
  isCanceling = true;
  selected.value = previousValue.value; // Revert to previous value
  isOpen.value = false; // Close dialog
};
</script>

<style scoped></style>
