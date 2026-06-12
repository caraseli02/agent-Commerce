<script setup lang="ts" generic="TData">
import type { Column } from '@tanstack/vue-table';
import type { Component } from 'vue';
import { CheckIcon, PlusCircleIcon } from 'lucide-vue-next';
import type { OrderStatus } from '~/types/order-summary/item';

import { cn } from '@/lib/utils';

interface FacetedFilterOption<TValue extends PropertyKey = string> {
    label: string | null;
    value: TValue;
    icon?: Component;
    color?: string;
    badge?: {
        bg: string;
        text?: string;
    };
}

interface DataTableFacetedFilter<TValue extends PropertyKey = string> {
    column?: Column<TData, unknown>;
    title?: string;
    options?: FacetedFilterOption<TValue>[];
    statusColors?: Partial<Record<string, string>>;
}

const props = defineProps<DataTableFacetedFilter>();

const selectedValues = computed(() => new Set(props.column?.getFilterValue() as string[]));

const activeFilterValues = computed((): string[] => {
    const raw = props.column?.getFilterValue();
    return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : [];
});
</script>

<template>
    <UiPopover class="">
        <UiPopoverTrigger as-child>
            <UiButton variant="outline" size="sm" class="!ml-0 border-dashed text-neutral-700 hover:bg-light-300">
                <PlusCircleIcon class="mr-2 h-4 w-4" />
                {{ title }}
                <template v-if="selectedValues.size > 0">
                    <UiSeparator orientation="vertical" class="mx-2 h-4 bg-grey-300" />
                    <UiBadge
                        variant="secondary"
                        class="bg-light-300 text-neutral-700 rounded-sm px-1 py-[3px] font-normal lg:hidden hover:bg-light-500"
                    >
                        {{ selectedValues.size }}
                    </UiBadge>
                    <div class="hidden space-x-1 lg:flex">
                        <UiBadge
                            v-if="selectedValues.size > 2"
                            variant="secondary"
                            class="rounded bg-light-300 hover:bg-light-500 text-neutral-700 px-1 py-[3px] font-normal"
                        >
                            {{ selectedValues.size }} selected
                        </UiBadge>

                        <template v-else>
                            <template v-if="options">
                                <UiBadge
                                    v-for="option in options.filter((option) => selectedValues.has(option.value))"
                                    :key="option.value"
                                    variant="secondary"
                                    class="rounded bg-light-300 px-1 py-[3px] font-normal text-neutral-700"
                                >
                                    <span
                                        v-if="option?.badge"
                                        :class="option?.badge?.bg"
                                        class="h-4 w-4 mr-2 rounded-full font-poppins text-[12px] leading-3 text-white flex justify-center items-center"
                                    >
                                        {{ option?.badge?.text }}
                                    </span>
                                    <span
                                        v-if="option?.color"
                                        :class="option?.color"
                                        class="h-3 w-3 mr-2 rounded-full text-xs flex justify-center items-center"
                                    />
                                    {{ option.label }}
                                </UiBadge>
                            </template>
                            <template v-if="statusColors">
                                <UiBadge
                                    v-for="option in activeFilterValues.filter((option) => selectedValues.has(option))"
                                    :key="option"
                                    variant="secondary"
                                    class="rounded bg-light-300 px-1 py-[3px] font-normal text-neutral-700"
                                >
                                    <span
                                        :class="statusColors?.[option as OrderStatus]"
                                        class="h-3 w-3 mr-2 rounded-full text-xs flex justify-center items-center"
                                    />
                                    {{ option }}
                                </UiBadge>
                            </template>
                        </template>
                    </div>
                </template>
            </UiButton>
        </UiPopoverTrigger>
        <UiPopoverContent class="w-[215px] p-0" align="start">
            <UiCommand>
                <UiCommandInput v-if="statusColors" :placeholder="title" />
                <UiCommandList>
                    <UiCommandEmpty>No results found.</UiCommandEmpty>
                    <UiCommandGroup>
                        <template v-if="options">
                            <UiCommandItem
                                v-for="option in options"
                                :key="option.value"
                                :value="option"
                                @select="
                                    () => {
                                        const isSelected = selectedValues.has(option.value);
                                        if (isSelected) {
                                            selectedValues.delete(option.value);
                                        } else {
                                            selectedValues.add(option.value);
                                        }
                                        const filterValues = Array.from(selectedValues);
                                        column?.setFilterValue(filterValues.length ? filterValues : undefined);
                                    }
                                "
                            >
                                <div
                                    :class="
                                        cn(
                                            'mr-3 flex h-4 w-4 items-center justify-center rounded',
                                            selectedValues.has(option.value)
                                                ? 'bg-blue-500 text-white'
                                                : 'opacity-50 [&_svg]:invisible border border-grey-600'
                                        )
                                    "
                                >
                                    <CheckIcon :class="cn('h-4 w-4')" />
                                </div>
                                <span
                                    v-if="option?.badge"
                                    :class="option?.badge?.bg"
                                    class="h-4 w-4 mr-2 rounded-full text-[12px] leading-3 text-white flex justify-center items-center"
                                >
                                    {{ option?.badge?.text }}
                                </span>
                                <span
                                    v-if="option?.color"
                                    :class="option?.color"
                                    class="h-3 w-3 mr-2 rounded-full text-xs text-white flex justify-center items-center"
                                />
                                <option.icon v-if="option.icon" class="mr-2 h-4 w-4 text-muted-foreground" />
                                <span class="inline truncate cursor-pointer">{{ option.label }}</span>
                            </UiCommandItem>
                        </template>
                        <template v-if="statusColors">
                            <UiCommandItem
                                v-for="(color, value) in statusColors"
                                :key="value"
                                :value="value"
                                @select="
                                    () => {
                                        const isSelected = selectedValues.has(value);
                                        if (isSelected) {
                                            selectedValues.delete(value);
                                        } else {
                                            selectedValues.add(value);
                                        }
                                        const filterValues = Array.from(selectedValues);
                                        column?.setFilterValue(filterValues.length ? filterValues : undefined);
                                    }
                                "
                            >
                                <div
                                    :class="
                                        cn(
                                            'mr-3 flex h-4 w-4 items-center justify-center rounded',
                                            selectedValues.has(value)
                                                ? 'bg-blue-500 text-white'
                                                : 'opacity-50 [&_svg]:invisible border border-grey-600'
                                        )
                                    "
                                >
                                    <CheckIcon :class="cn('h-4 w-4')" />
                                </div>
                                <span
                                    v-if="color"
                                    :class="color"
                                    class="h-3 w-3 mr-2 rounded-full text-xs text-white flex justify-center items-center"
                                />
                                <span class="inline truncate cursor-pointer">{{ value }}</span>
                                <!-- <span v-if="facets?.get(option.value)" class="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                                {{ facets.get(option.value) }}
                              </span> -->
                            </UiCommandItem>
                        </template>
                    </UiCommandGroup>

                    <template v-if="selectedValues.size > 0">
                        <UiSeparator class="bg-grey-300" />
                        <UiCommandGroup>
                            <UiCommandItem
                                :value="{ label: 'Clear filters' }"
                                class="justify-center text-center"
                                @select="column?.setFilterValue(undefined)"
                            >
                                Clear filters
                            </UiCommandItem>
                        </UiCommandGroup>
                    </template>
                </UiCommandList>
            </UiCommand>
        </UiPopoverContent>
    </UiPopover>
</template>
