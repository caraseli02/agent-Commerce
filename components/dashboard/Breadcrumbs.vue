<template>
    <div class="flex items-center justify-between mb-6">
        <div>
            <div class="flex flex-wrap gap-y-2 items-center mb-3">
                <NuxtLink
                    to="/dashboard"
                    class="flex items-center flex-shrink-0 font-medium text-slate-500 transition-colors duration-300 hover:text-blue-500"
                >
                    <HomeIcon class="w-[18px] h-[18px] mr-2" />
                    <span class="text-xs leading-[1.33]">Home</span>
                </NuxtLink>
                <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
                <NuxtLink
                    to="/dashboard/customers"
                    class="text-xs leading-[1.33] flex-shrink-0 font-medium transition-colors duration-300 hover:text-blue-500"
                    :class="[customer ? 'text-slate-500' : 'text-blue-500']"
                >
                    Customers
                </NuxtLink>
                <template v-if="customer">
                    <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
                    <NuxtLink
                        :to="`/dashboard/customers/${customer.replace(/ /g, '-')}`"
                        class="text-xs leading-[1.33] font-medium flex-shrink-0 text-blue-500 transition-colors duration-300 hover:text-blue-500"
                        :class="[panelView ? 'text-slate-500' : 'text-blue-500']"
                    >
                        {{ customerName }}
                    </NuxtLink>
                </template>
                <template v-if="panelView && customer">
                    <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
                    <NuxtLink
                        :to="`/dashboard/customers/${customer}/control-panel/${accountType == 0 ? 'account' : 'organization'}`"
                        class="text-xs leading-[1.33] font-medium text-slate-500 flex-shrink-0 transition-colors duration-300 hover:text-blue-500"
                    >
                        Control Panel
                    </NuxtLink>
                    <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
                    <div class="text-xs leading-[1.33] font-medium flex-shrink-0 text-blue-500 capitalize">
                        {{ panelView.replace(/-/g, ' ') }}
                    </div>
                </template>
            </div>
            <h2 class="text-xl leading-[1.4] text-neutral-700 font-semibold">
                {{ title }}
            </h2>
        </div>
        <slot />
    </div>
</template>

<script setup lang="ts">
import HomeIcon from '@/assets/icons/dashboard/home.svg';

defineProps({
    title: {
        type: String,
        required: true,
    },
    customer: {
        type: String,
        required: false,
    },
    panelView: {
        type: String,
        required: false,
    },
    accountType: {
        type: Number,
        required: false,
        default: 0,
    },
    customerName: {
        type: String,
        required: false,
        default: '',
    },
});
</script>
