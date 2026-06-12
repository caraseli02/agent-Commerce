<template>
    <div class="fixed z-[60] top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
        <div
            class="relative flex flex-col z-10 w-[358px] max-w-[calc(100vw-32px)] max-h-[85vh] pt-4 pb-6 bg-white rounded-xl pointer-events-auto shadow-xs md:w-[640px] md:pt-6 md:pb-9"
        >
            <div class="flex items-start justify-between px-4 mb-9 md:px-6">
                <div class="font-semibold leading-[1.5]">Add Shipping Address</div>
                <button
                    class="w-8 h-8 bg-gray-100 flex items-center justify-center text-slate-500 rounded-lg ml-auto mb-4 transition-colors duration-300 hover:text-blue-500"
                    @click="$emit('close')"
                >
                    <XIcon class="w-6 h-6" />
                </button>
            </div>
            <div class="flex-1 overflow-y-auto scrollbar-thin mr-1">
                <div class="grid grid-cols-1 gap-6 pl-4 pr-3 mb-9 md:pl-6 md:pr-3">
                    <FormInput
                        v-model="data.alias.value"
                        :error="data.alias.error"
                        :icon="BusinessIcon"
                        label="Address Alias"
                        size="lg"
                        placeholder="Address Alias 1"
                    />
                    <FormSelect
                        v-model="data.country.value"
                        :error="data.country.error"
                        :options="countries"
                        label="Country"
                        search
                        placeholder="Select Country"
                        size="lg"
                        class="relative z-20"
                    />
                    <FormSelect
                        v-model="data.region.value"
                        :error="data.region.error"
                        :options="regions"
                        :disabled="regions.length === 0"
                        :show-disabled-styles="false"
                        search
                        label="County/Region"
                        placeholder=""
                        size="lg"
                        class="relative z-10"
                    />
                    <FormInput v-model="data.city.value" :error="data.city.error" label="City" size="lg" placeholder="Bucharest" />

                    <FormInput
                        v-model="data.name1.value"
                        :error="data.name1.error"
                        label="Address Line 1"
                        size="lg"
                        placeholder="5073 Mark Brown Rd"
                    />
                    <FormInput
                        v-model="data.name2.value"
                        :error="data.name2.error"
                        label="Address Line 2"
                        size="lg"
                        placeholder="NE Dalton"
                    />
                    <FormInput v-model="data.postcode.value" :error="data.postcode.error" label="Postcode" size="lg" placeholder="W1A5AB" />
                    <FormInput
                        v-model="data.phone.value"
                        :error="data.phone.error"
                        type="tel"
                        label="Phone Number"
                        size="lg"
                        placeholder="+1 (706) 275-0767"
                    />
                </div>
                <div class="grid grid-cols-[auto,1fr] gap-4 pl-4 pr-3 md:pl-6 md:pr-3">
                    <button
                        class="flex px-[41px] py-2 rounded-lg bg-gray-100 leading-[1.75] text-slate-500 font-medium"
                        @click="$emit('close')"
                    >
                        Cancel
                    </button>
                    <button
                        class="flex justify-center px-5 py-2 rounded-lg bg-blue-500 leading-[1.75] text-white font-medium"
                        @click="handleSave()"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import BusinessIcon from '@/assets/icons/dashboard/business.svg';
import XIcon from '@/assets/icons/dashboard/x.svg';
import { countries } from '@/data/countries';
import type { FormSelectOption } from '~/types';

const data = ref({
    alias: {
        value: '',
        error: '',
    },
    country: {
        value: {
            value: '',
            label: '',
            icon: '',
        } as FormSelectOption,
        error: '',
    },
    region: {
        value: {
            value: '',
            label: '',
        } as FormSelectOption,
        error: '',
    },
    city: {
        value: '',
        error: '',
    },
    name1: {
        value: '',
        error: '',
    },
    name2: {
        value: '',
        error: '',
    },
    postcode: {
        value: '',
        error: '',
    },
    phone: {
        value: '',
        error: '',
    },
});
const regions = ref<FormSelectOption[]>([]);

const props = defineProps({
    type: {
        type: String,
        required: true,
    },
});

watch(
    () => data.value.country,
    (newVal) => {
        if (newVal?.value && typeof newVal.value === 'object' && 'value' in newVal.value) {
            data.value.region = {
                value: { label: '', value: '' },
                error: '',
            };
            regions.value =
                countries
                    .find((e) => e.value === newVal.value.value)
                    ?.regions.map((e) => {
                        return {
                            label: e.name,
                            value: e.name,
                        };
                    }) || [];
        }
    }
);

const emit = defineEmits(['close', 'add-shipping-address', 'add-billing-address']);

// Other data and function definitions here...

const handleSave = () => {
    // Emit the edit event, debounced
    if (props.type === 'shipping') {
        emit('add-shipping-address', { address: data.value });
    } else {
        emit('add-billing-address', { address: data.value });
    }
};
</script>
