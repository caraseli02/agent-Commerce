<script setup lang="ts">
import { PlusIcon } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import QuickBuyIcon from '@/assets/icons/quick-buy-2.svg';
import CartIcon from '@/assets/icons/cart.svg';
import type { AddToCartRequestInterface, CartProductsInterface } from '~/types/cart';
import { useCart } from '~/composables/useCart';
import type { QuickBuyItem } from '~/types/product';
const { addToCart: addCartItem } = useCart();
const products = ref<Omit<QuickBuyItem, 'index'>[]>([
  { code: '', quantity: 1 },
  { code: '', quantity: 1 },
]);
const isOpen = ref(false);
const isLoading = ref(false);
const hasSubmitted = ref(false);
const formError = ref('');
const successMessage = ref('');
const hasProductCode = computed(() => products.value.some((product) => product.code.trim()));

const updateProduct = (payload: QuickBuyItem) => {
  const product = products.value[payload.index];
  if (!product) return;
  product.code = payload.code;
  product.quantity = payload.quantity;
};

const removeProduct = (index: number) => {
  products.value.splice(index, 1);
};

const addProduct = () => {
  products.value.push({ code: '', quantity: 1 });
};

const addToCart = async () => {
  hasSubmitted.value = true;
  formError.value = '';
  successMessage.value = '';
  if (!hasProductCode.value) {
    formError.value = 'Add at least one manufacturer part number before adding to cart.';
    return;
  }

  isLoading.value = true;
  try {
    const productsPayload: CartProductsInterface[] = [];
    for (const product of products.value) {
      if (product.code.trim()) {
        productsPayload.push({
          id: product.code.trim(),
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
    const object = (await addCartItem(payload)) as { status?: string; changed?: boolean } | null;
    if (object?.status === 'success' && object.changed !== false) {
      isOpen.value = false;
      successMessage.value = `${productsPayload.length} ${productsPayload.length === 1 ? 'part' : 'parts'} added to your cart.`;
    } else if (object?.status === 'success') {
      formError.value = 'No parts were added. Check each part number and try again.';
    } else {
      formError.value = 'We could not add those parts. Check the part numbers and try again.';
    }
  } finally {
    isLoading.value = false;
  }
};

watch(isOpen, (open) => {
  if (open) {
    hasSubmitted.value = false;
    formError.value = '';
  }
});

const isInvalidRow = (product: Omit<QuickBuyItem, 'index'>) => hasSubmitted.value && !hasProductCode.value && !product.code.trim();
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)] md:px-8">
    <div class="flex flex-col items-center mb-[13px] px-[15px] md:px-2.5">
      <QuickBuyIcon class="mr-2" />
      <h2 class="text-2xl font-semibold text-slate-900">Quick Buy</h2>
    </div>
    <p class="mx-auto mb-6 max-w-lg px-[15px] text-center text-sm leading-5 text-slate-500 md:px-2.5 lg:mb-7">
      Have a part list ready? Add manufacturer part numbers and quantities directly to your cart.
    </p>
    <div
      v-if="successMessage"
      class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
      role="status"
      aria-live="polite"
    >
      {{ successMessage }}
      <NuxtLink to="/cart" class="ml-1 font-semibold underline underline-offset-2 hover:text-emerald-950">View cart</NuxtLink>
    </div>
    <UiDialog v-model:open="isOpen">
      <UiDialogTrigger as-child>
        <button
          type="button"
          class="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 py-2 text-white transition-colors motion-reduce:transition-none hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
        >
          <CartIcon class="w-6 h-6 mr-2" />
          <span class="text-sm font-medium">Add to cart</span>
        </button>
      </UiDialogTrigger>
      <UiDialogContent class="max-w-[358px] sm:max-w-[640px] rounded-lg">
        <UiDialogHeader>
          <UiDialogTitle>Quick buy</UiDialogTitle>
        </UiDialogHeader>
        <p class="text-sm text-slate-500">Paste one or more manufacturer part numbers from your BOM. Remove any rows you do not need.</p>
        <div class="grid gap-4 py-4" aria-live="polite">
          <QuickBuyInput
            v-for="(product, index) in products"
            :key="index"
            :index="index"
            :code="product.code"
            :quantity="product.quantity"
            :error="isInvalidRow(product) ? 'Add a part number or remove this row.' : ''"
            :can-remove="products.length > 1"
            @update-product="updateProduct"
            @remove-product="removeProduct"
          />
        </div>
        <p v-if="formError" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900" role="alert">
          {{ formError }}
        </p>
        <UiDialogFooter class="w-full">
          <div class="flex gap-2.5 w-full">
            <UiButton variant="secondary" @click="addProduct">
              <PlusIcon class="w-5 h-5" />
            </UiButton>
            <UiButton :disabled="isLoading" class="w-full" @click="addToCart">
              <CartIcon class="w-6 h-6 mr-2" />
              <span class="text-sm font-medium">{{ isLoading ? 'Adding parts…' : 'Add to cart' }}</span>
            </UiButton>
          </div>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
