<template>
    <ProductBlocks masonry-view :rows-number="2" class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="filters">
        <template #banner>
            <div class="md:pt-6 md:pr-0 h-[calc(100%-30px)] mx-2 md:mx-3 xl:mx-0 xl:mr-3 xl:min-w-[330px] xl:min-h-[592px]">
                <div class="flex h-full gap-4 md:gap-[40px] bg-white rounded-xl shadow-xs p-6 md:m-0 xl:flex-col xl:w-[330px] xl:mb-[30px]">
                    <img
                        :src="BlackFridayItem"
                        alt="Black Friday Product"
                        class="h-[100px] w-[120px] md:h-auto md:w-[290px] md:max-h-[240px] xl:w-full"
                    />
                    <div class="flex-1 flex gap-4 flex-col justify-center xl:justify-start xl:items-start">
                        <div class="font-semibold text-sm xl:text-xl">Exclusive Black Friday</div>
                        <p class="text-xs text-slate-500 md:text-[13px] xl:text-base">
                            Shop our Black Friday deals — up to 30% off on selected electronics and accessories. Limited time only.
                        </p>
                        <button
                            class="flex w-fit bg-blue-500 text-[13px] font-medium px-3 py-1.5 rounded-lg text-white md:text-sm md:px-6 md:py-[11px] xl:mx-auto xl:mt-6"
                        >
                            View More
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </ProductBlocks>
</template>

<script setup lang="ts">
import BlackFridayItem from '@/assets/media/home/black-friday-item.png';
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { fetchProductTab } from '~/composables/api/products';

const productList = ref<ProductInterface[]>([]);

const filters = ['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched'];

async function getProductTab() {
    try {
        const response = await fetchProductTab('featured');
        const data = response?.data || response;

        if (Array.isArray(data)) {
            productList.value = data as ProductInterface[];
        } else {
            productList.value = [];
        }
    } catch (_error) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        productList.value = [];
    }
}

onMounted(() => {
    getProductTab();
});
</script>
