<script setup lang="ts">
import { PlusIcon } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';
import QuickBuyIcon from '@/assets/icons/quick-buy-2.svg';
import CartIcon from '@/assets/icons/cart.svg';
import type { AddToCartRequestInterface } from '~/model/cart/request/cart.interface';
import type { CartProductsInterface } from '~/model/cart/response/cart.interface';
import { addEntityToCart } from '~/composables/api/cart';
import { useCartStore } from '~/store/cartStore';
import type { QuickBuyItem } from '~/types/product';
const cartStore = useCartStore();
const products = ref<Omit<QuickBuyItem, 'index'>[]>([
  { code: '', quantity: 1 },
  { code: '', quantity: 1 },
]);

const updateProduct = (payload: QuickBuyItem) => {
  products.value[payload.index].code = payload.code;
  products.value[payload.index].quantity = payload.quantity;
};

const removeProduct = (index: number) => {
  products.value.splice(index, 1);
};

const addProduct = () => {
  products.value.push({ code: '', quantity: 1 });
};

const addToCart = async () => {
  isLoading.value = true;
  const productsPayload: CartProductsInterface[] = [];
  for (const product of products.value) {
    if (product.code) {
      productsPayload.push({
        id: product.code,
        stock: product.quantity,
        isFolder: false,
        initialUnitPrice: 0,
        unitPriceAfterDiscounts: 0,
        total: 0,
        subtotal: 0,
        discount: { value: 0, startDate: '', endDate: '' },
      });
    }
  }
  const payload: AddToCartRequestInterface = {
    userId: '',
    products: productsPayload,
  };
  const object = (await addEntityToCart(payload)) as { status?: string };
  if (object.status === 'success') {
    await cartStore.updateAndReturnCart();
    isOpen.value = false;
  }
  isLoading.value = false;
};

onMounted(() => {
  if (window.innerWidth < 768) {
    products.value.push({ code: '', quantity: 1 });
  }
});

const isOpen = ref(false);
const isLoading = ref(false);
</script>

<template>
  <div class="bg-white rounded-md shadow-xs py-6 px-8">
    <div class="flex flex-col items-center mb-[13px] px-[15px] md:px-2.5">
      <QuickBuyIcon class="mr-2" />
      <h2 class="text-3xl font-semibold text-neutral-700">Quick Buy</h2>
    </div>
    <p class="text-xs text-center text-slate-500 px-[15px] mb-6 md:px-2.5 md:mb-[15px] lg:mb-6 xl:text-sm xl:mb-[24px]">
      Are you in a hurry? Use the Quick Buy feature!
    </p>
    <UiDialog v-model:open="isOpen">
      <UiDialogTrigger as-child>
        <div class="flex gap-2.5 py-3">
          <button class="flex items-center justify-center flex-1 bg-blue-500 rounded-lg text-white py-2">
            <CartIcon class="w-6 h-6 mr-2" />
            <span class="text-sm font-medium">Add to cart</span>
          </button>
        </div>
      </UiDialogTrigger>
      <UiDialogContent class="max-w-[358px] sm:max-w-[640px] rounded-lg">
        <UiDialogHeader>
          <UiDialogTitle>Quick buy</UiDialogTitle>
        </UiDialogHeader>
        <div class="grid gap-4 py-4">
          <QuickBuyInput
            v-for="(product, index) in products"
            :key="index"
            :index="index"
            :code="product.code"
            :quantity="product.quantity"
            @update-product="updateProduct"
            @remove-product="removeProduct"
          />
        </div>
        <UiDialogFooter class="w-full">
          <div class="flex gap-2.5 w-full">
            <UiButton variant="secondary" @click="addProduct">
              <PlusIcon class="w-5 h-5" />
            </UiButton>
            <UiButton :disabled="isLoading" class="w-full" @click="addToCart">
              <CartIcon class="w-6 h-6 mr-2" />
              <span class="text-sm font-medium">Add to cart</span>
            </UiButton>
          </div>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
