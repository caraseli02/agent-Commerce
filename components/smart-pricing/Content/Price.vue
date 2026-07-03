<script setup lang="ts">
import { SearchIcon, Trash2Icon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { usePricingStore } from '~/store/pricingStore';
import type { SmartPricingOption } from '~/model/prices/price-settings.interface';
import { PriceSettingsTypeEnum } from '~/model/prices/price-settings.interface';
import { deleteSmartPricingEntity } from '~/composables/api/smart-pricing';

const pricingStore = usePricingStore();
const { showEntryModal, pricing, range } = storeToRefs(pricingStore);

const entryPriceList = ref<SmartPricingOption[]>([...range.value]);

watch(
  () => pricingStore.range,
  (newRange) => {
    entryPriceList.value = newRange;
  },
  { deep: true }
);

const deleteItem = async (itemValue: SmartPricingOption) => {
  const response = await deleteSmartPricingEntity(PriceSettingsTypeEnum.Range, itemValue._id);
  if (response.status !== 'success') {
    return;
  }
  pricingStore.removePriceRange(itemValue._id);
  entryPriceList.value = entryPriceList.value.filter((i) => i._id !== itemValue._id);
};

function deleteAllSelected() {
  const selectedItems = entryPriceList.value.filter((i) => i.selected);

  selectedItems.map(async (price) => {
    const response = await deleteSmartPricingEntity(PriceSettingsTypeEnum.Range, price._id);
    if (response.status !== 'success') {
      return;
    }
    pricingStore.removePriceRange(price._id);
    entryPriceList.value = entryPriceList.value.filter((i) => i._id !== price._id);
  });
}

const editItem = async (itemValue: SmartPricingOption) => {
  if (!pricing.value) {
    return;
  }
  const filteredItems = pricing.value.filter((i) => i._id === itemValue._id);
  pricingStore.editEntryPriceModal = filteredItems.length > 0 ? filteredItems[0] : null;
  showEntryModal.value = true;
};

const selectedCount = computed(() => entryPriceList.value.filter((i) => i.selected).length);
</script>

<template>
  <div class="w-full h-30 bg-light-200 flex flex-col sm:flex-row justify-between items-center p-3 gap-2">
    <div class="relative w-full max-w-sm items-center">
      <UiInput id="search" type="text" placeholder="Search..." class="pr-10 placeholder:text-grey-600" />
      <span class="absolute end-0 inset-y-0 flex items-center justify-center px-2">
        <SearchIcon class="size-5 text-grey-600" />
      </span>
    </div>
    <div v-if="selectedCount > 0" class="self-end flex items-center">
      <span class="text-neutral-700 mr-2 text-sm">{{ selectedCount }} {{ selectedCount > 1 ? 'items' : 'item' }} selected</span>
      <UiButton class="gap-1" variant="secondary" @click="deleteAllSelected">
        <Trash2Icon class="w-4 h-4" />
        Delete
      </UiButton>
    </div>
  </div>
  <section class="flex flex-wrap gap-4">
    <SmartPricingCheckItem
      v-for="item in entryPriceList"
      :key="item.value.join('-')"
      :item="item"
      @delete-item="deleteItem(item)"
      @update-selected="item.selected = $event"
      @edit-item="editItem(item)"
    />
  </section>
</template>

<style scoped></style>
