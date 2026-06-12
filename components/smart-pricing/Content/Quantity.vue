<script setup lang="ts">
import { SearchIcon, Trash2Icon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { usePricingStore } from '~/store/pricingStore';
import type { SmartPricingOption } from '~/model/prices/price-settings.interface';

import { useNuxtApp } from '#app';
import { PriceSettingsTypeEnum } from '~/model/prices/price-settings.interface';

const pricingStore = usePricingStore();

const { showQuantityModal, pricing, quantity } = storeToRefs(pricingStore);

const { $api } = useNuxtApp();

const quantityList = ref<SmartPricingOption[]>([...pricingStore.quantity]);

watch(
    () => pricingStore.quantity,
    (newRange) => {
        quantityList.value = newRange;
    },
    { deep: true }
);

const deleteItem = async (itemValue: SmartPricingOption) => {
    const response = await $api.smartPricing.deleteSmartPricingEntity(PriceSettingsTypeEnum.Quantity, itemValue._id);
    if (response.status !== 'success') {
        return;
    }
    pricingStore.removeQuantityRange(itemValue._id);
    quantityList.value = quantityList.value.filter((i) => i._id !== itemValue._id);
};

function deleteAllSelected() {
    const selectedItems = quantityList.value.filter((i) => i.selected);

    selectedItems.map(async (item) => {
        const response = await $api.smartPricing.deleteSmartPricingEntity(PriceSettingsTypeEnum.Quantity, item._id);
        if (response.status !== 'success') {
            return;
        }
        pricingStore.removeQuantityRange(item._id);
        quantityList.value = quantityList.value.filter((i) => i._id !== item._id);
    });
}

const selectedCount = computed(() => quantityList.value.filter((i) => i.selected).length);

const editItem = async (itemValue: SmartPricingOption) => {
    if (!pricing.value) {
        console.error('Pricing is not defined');
        return;
    }
    const filteredItems = quantity.value.filter((i) => i._id === itemValue._id);
    pricingStore.editQuantityModal = filteredItems.length > 0 ? filteredItems[0] : null;
    showQuantityModal.value = true;
};
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
            v-for="item in quantityList"
            :key="item.label"
            :item="item"
            @update-selected="item.selected = $event"
            @delete-item="deleteItem(item)"
            @edit-item="editItem(item)"
        />
    </section>
</template>

<style scoped></style>
