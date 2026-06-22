<template>
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mx-2 md:mx-3 xl:mx-3">
        <h2 class="hidden text-xl font-medium md:block">
            {{ activeFilter.charAt(0).toUpperCase() + activeFilter.substr(1).toLowerCase().replace('-', ' ') }}
            Products
        </h2>
        <div class="relative flex items-center gap-4 xl:gap-6 mb-6 md:mb-0 overflow-x-auto max-w-full pb-1">
            <p v-for="(filter, index) in filters" :key="index" class="relative overflow-hidden shrink-0">
                <button
                    class="relative text-sm font-medium pb-[13px] transition-colors duration-300 hover:text-blue-500 md:text-base md:pb-3 whitespace-nowrap"
                    :class="[activeFilter === textUtil.slugify(filter) ? 'text-blue-500' : 'text-slate-500 after:opacity-0']"
                    @click="setActiveFilter(filter)"
                >
                    {{ filter }}
                </button>
                <span
                    :class="activeFilter === textUtil.slugify(filter) ? 'left-0 w-full' : '-left-4 w-0'"
                    class="absolute bottom-0 left-0 h-[4px] bg-blue-500 rounded-full transition-all duration-300"
                />
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { fetchProductTab } from '~/composables/api/products';

const props = defineProps<{
    filters: string[];
}>();

const emit = defineEmits<{
    newProducts: [val: ProductInterface[]];
}>();

const activeFilter = ref('');

onMounted(() => {
    if (props.filters.length > 0) {
        setActiveFilter(props.filters[0]);
    }
});

const setActiveFilter = (filter: string) => {
    activeFilter.value = textUtil.slugify(filter);
};

watch(activeFilter, async (value) => {
    if (!value) return;
    try {
        const response = await fetchProductTab(value);
        const data = response?.data || response;

        if (Array.isArray(data)) {
            emit('newProducts', data);
        } else {
            emit('newProducts', []);
        }
    } catch (_error) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        emit('newProducts', []);
    }
});
</script>

<style scoped></style>
