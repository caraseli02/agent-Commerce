<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { CaretSortIcon, CheckIcon } from '@radix-icons/vue';
import { storeToRefs } from 'pinia';
import { cn } from '@/lib/utils';
import { usePricingStore } from '~/store/pricingStore';
import type { SmartPricingOption } from '~/model/prices/price-settings.interface';

const pricingStore = usePricingStore();
const { range } = storeToRefs(pricingStore);

const frameworks = computed(() => range.value);

const emit = defineEmits<{
    (e: 'update:entry-price', value: string): void;
}>();

const props = withDefaults(
    defineProps<{
        title: string;
        entryPrice?: string;
    }>(),
    {
        entryPrice: '',
    }
);

const open = ref(false);
const value = ref<string[]>([]);

const handleSelect = (framework: SmartPricingOption) => {
    value.value = framework.value;
    emit('update:entry-price', framework._id);
    open.value = false;
};

const selectedLabel = computed(() => {
    if (!value.value.length) {
        return `Select ${props.title} Template`;
    }

    const match = frameworks.value.find((framework) => framework.value.some((val) => value.value.includes(val)));
    return match?.label ?? `Select ${props.title} Template`;
});

watchEffect(() => {
    if (props.entryPrice) {
        const selectedFramework = range.value.find((entry: SmartPricingOption) => entry._id === props.entryPrice);
        if (selectedFramework) {
            value.value = selectedFramework.value;
        }
    }
});
</script>

<template>
    <section class="flex flex-col gap-1 entry-price">
        <span class="text-grey-600 text-sm">{{ title }}</span>
        <UiPopover v-model:open="open" class="w-full">
            <UiPopoverTrigger as-child>
                <UiButton variant="outline" role="combobox" :aria-expanded="open" class="w-full justify-between">
                    {{ selectedLabel }}
                    <CaretSortIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </UiButton>
            </UiPopoverTrigger>
            <UiPopoverContent disabled-portal class="w-full p-0">
                <UiCommand class="w-full">
                    <UiCommandInput class="h-9" placeholder="Search framework..." />
                    <UiCommandEmpty>No framework found.</UiCommandEmpty>
                    <UiCommandList>
                        <UiCommandGroup>
                            <UiCommandItem
                                v-for="framework in frameworks"
                                :key="framework._id"
                                class="flex justify-between items-center w-full"
                                :value="framework.label"
                                @select="() => handleSelect(framework)"
                            >
                                {{ framework.label }}
                                <div class="flex items-center gap-1 p-0.5">
                                    <div v-for="val in framework.value" :key="val">
                                        <UiBadge class="bg-light-300" variant="secondary">
                                            {{ val }}
                                        </UiBadge>
                                    </div>
                                    <CheckIcon
                                        :class="
                                            cn(
                                                'ml-auto h-4 w-4',
                                                framework.value.some((val) => value.includes(val)) ? 'opacity-100' : 'opacity-0'
                                            )
                                        "
                                    />
                                </div>
                            </UiCommandItem>
                        </UiCommandGroup>
                    </UiCommandList>
                </UiCommand>
            </UiPopoverContent>
        </UiPopover>
    </section>
</template>

<style>
.entry-price > [data-radix-popper-content-wrapper] {
    width: 100% !important;
    padding: 0 24px;
}

.entry-price > [data-radix-popper-content-wrapper] > div {
    width: 100% !important;
}

.entry-price > [data-radix-popper-content-wrapper] {
    max-width: 100% !important;
}
</style>
