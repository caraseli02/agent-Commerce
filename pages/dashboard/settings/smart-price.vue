<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { usePricingStore } from '~/store/pricingStore';

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});

const pricingStore = usePricingStore();
const { showEntryModal, showMarginModal, showQuantityModal, editEntryPriceModal, editMarginModal, editQuantityModal } =
  storeToRefs(pricingStore);

const selectedTab = ref('entryPrice');

const tabs = ref<{ value: string; label: string; badge: number }[]>([
  { value: 'entryPrice', label: 'Entry Price', badge: 0 },
  { value: 'quantity', label: 'Quantity', badge: 0 },
  { value: 'margin', label: 'Gross/Net Margin', badge: 0 },
]);

onMounted(async () => {
  if (!pricingStore.pricing) {
    await pricingStore.updateAndReturnPricing();
    tabs.value = [
      { value: 'entryPrice', label: 'Entry Price', badge: pricingStore.range.length || 0 },
      { value: 'quantity', label: 'Quantity', badge: pricingStore.quantity.length || 0 },
      { value: 'margin', label: 'Gross/Net Margin', badge: pricingStore.margin.length || 0 },
    ];
  }
});

watch(
  () => [pricingStore.range, pricingStore.quantity, pricingStore.margin],
  () => {
    tabs.value = [
      { value: 'entryPrice', label: 'Entry Price', badge: pricingStore.range?.length || 0 },
      { value: 'quantity', label: 'Quantity', badge: pricingStore.quantity?.length || 0 },
      { value: 'margin', label: 'Gross/Net Margin', badge: pricingStore.margin?.length || 0 },
    ];
  },
  { immediate: true }
);
</script>

<template>
  <section class="w-[1488px] max-w-full p-4 mx-auto transition-all duration-300 md:py-6 2xl:px-6">
    <SmartPricingBreadcrumbs title="Smart Pricing" />
    <div class="container m-0 overflow-hidden pb-10 bg-white min-h-screen mb-4 rounded-xl">
      <section class="flex items-center w-full justify-between mt-6 mb-9">
        <h4 class="text-xl font-semibold">Smart Pricing</h4>
        <UiPopover>
          <UiPopoverTrigger>
            <UiButton class="gap-2">
              Create New
              <ChevronDown class="w-4 h-4" />
            </UiButton>
          </UiPopoverTrigger>
          <UiPopoverContent align="end" class="w-[220px] flex flex-col">
            <UiButton
              class="justify-start hover:text-blue-500"
              variant="ghost"
              @click="
                showEntryModal = true;
                editEntryPriceModal = null;
                pricingStore.type = 'add';
              "
            >
              Entry Price
            </UiButton>
            <UiButton
              class="justify-start hover:text-blue-500"
              variant="ghost"
              @click="
                showQuantityModal = true;
                pricingStore.type = 'add';
                editQuantityModal = null;
              "
            >
              Quantity
            </UiButton>
            <UiButton
              class="justify-start hover:text-blue-500"
              variant="ghost"
              @click="
                showMarginModal = true;
                editMarginModal = null;
                pricingStore.type = 'add';
              "
            >
              Margin
            </UiButton>
          </UiPopoverContent>
        </UiPopover>
      </section>
      <UiTabs v-model="selectedTab">
        <UiTabsList class="bg-white mb-12 p-0 w-full justify-start overflow-y-hidden min-h-[50px]">
          <template v-for="tab in tabs" :key="tab.value">
            <UiTabsTrigger class="pb-5 data-[state=active]:shadow-none data-[state=active]:text-blue-500 relative" :value="tab.value">
              {{ tab.label }}
              <UiBadge
                variant="secondary"
                :class="{ 'bg-blue-500 text-white': selectedTab === tab.value }"
                class="text-xs rounded-full p-1.5 min-w-5 h-5 ml-1"
              >
                {{ tab.badge }}
              </UiBadge>
              <div v-if="selectedTab === tab.value" class="w-full h-1 bg-blue-500 absolute bottom-0 rounded-full" />
            </UiTabsTrigger>
          </template>
        </UiTabsList>
        <UiTabsContent class="flex flex-col gap-8 m-0" value="entryPrice">
          <SmartPricingContentPrice v-if="pricingStore.range" />
        </UiTabsContent>
        <UiTabsContent class="flex flex-col gap-8 m-0" value="quantity">
          <SmartPricingContentQuantity v-if="pricingStore.quantity" />
        </UiTabsContent>
        <UiTabsContent class="flex flex-col gap-8 m-0" value="margin">
          <SmartPricingContentMargin v-if="pricingStore.margin" />
        </UiTabsContent>
      </UiTabs>
    </div>
    <LazySmartPricingEntryModal />
    <LazySmartPricingQuantityModal />
    <LazySmartPricingMarginModal />
  </section>
</template>

<style scoped></style>
