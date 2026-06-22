<template>
    <div class="flex flex-col">
        <div class="flex lg:hidden">
            <ProductBlocks
                v-if="!props.loading"
                order-summary-view
                :fetched-products="productList"
                class="mb-7 lg:mb-[38px] xl:mb-[58px] !px-0"
            >
                <template #header>
                    <section class="flex justify-between items-center px-2">
                        <div class="text-xl font-semibold">Similar Products</div>
                    </section>
                </template>
            </ProductBlocks>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { fetchProductTab } from '~/composables/api/products';

const props = defineProps({
    loading: {
        type: Boolean,
        required: true,
        default: false,
    },
});

const productList = ref<ProductInterface[]>([]);

async function getProductTab() {
    const { data } = await fetchProductTab('top-searched');

    if (data) {
        productList.value = data as unknown as ProductInterface[];
        // productList.value = data?.map((item) => ({
        //     slug: item._id,
        //     title: item.alias,
        //     category: 'Not supported',
        //     price: new Intl.NumberFormat('en-US', {
        //         minimumFractionDigits: 3,
        //     }).format(item.priceEur),
        //     cover: item.details.ProductImage.ProductImageLarge,
        //     stock: item.stock,
        // }));
    }
}

onMounted(() => {
    getProductTab();
});
</script>
