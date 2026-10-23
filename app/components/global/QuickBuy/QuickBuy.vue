<script setup lang="ts">
import { PlusIcon } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import QuickBuyIcon from '@/assets/icons/quick-buy-2.svg';
import CartIcon from '@/assets/icons/cart.svg';
import type { AddToCartRequestInterface, CartProductsInterface } from '~~/types/cart';
import { useCart } from '~/composables/useCart';
import type { QuickBuyItem } from '~~/types/product';
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
  <section class="flex h-full flex-col rounded-2xl border border-border bg-card p-5 md:p-8 lg:p-6 xl:p-8">
    <div class="flex items-start gap-3">
      <QuickBuyIcon class="mt-0.5 h-9 w-9 shrink-0" />
      <div>
        <h2 class="font-display text-xl font-semibold leading-tight tracking-[-0.015em] text-foreground md:text-2xl">Quick Buy</h2>
        <p class="mt-1.5 max-w-[52ch] text-[15px] leading-6 text-muted-foreground">
          Have a part list ready? Add manufacturer part numbers and quantities directly to your cart.
        </p>
      </div>
    </div>
    <div
      v-if="successMessage"
      class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      role="status"
      aria-live="polite"
    >
      {{ successMessage }}
      <NuxtLink to="/cart" class="ml-1 font-semibold underline underline-offset-2 hover:text-emerald-950 dark:hover:text-emerald-50"
        >View cart</NuxtLink
      >
    </div>
    <form class="mt-5 hidden min-h-0 flex-1 flex-col lg:flex" @submit.prevent="addToCart">
      <div class="grid gap-2" aria-live="polite">
        <QuickBuyInput
          v-for="(product, index) in products"
          :key="`desktop-${index}`"
          :index="index"
          :code="product.code"
          :quantity="product.quantity"
          :error="isInvalidRow(product) ? 'Add a part number or remove this row.' : ''"
          :can-remove="products.length > 1"
          @update-product="updateProduct"
          @remove-product="removeProduct"
        />
      </div>
      <p
        v-if="formError"
        class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
        role="alert"
      >
        {{ formError }}
      </p>
      <div class="mt-auto flex gap-2.5 pt-4">
        <UiButton type="button" variant="secondary" class="min-h-11" @click="addProduct">
          <PlusIcon class="w-5 h-5" />
          <span class="ml-1.5 text-sm">Add part</span>
        </UiButton>
        <UiButton type="submit" :disabled="isLoading" class="min-h-11 flex-1">
          <CartIcon class="w-6 h-6 mr-2" />
          <span class="text-sm font-medium">{{ isLoading ? 'Adding parts…' : 'Add to cart' }}</span>
        </UiButton>
      </div>
    </form>
    <div class="mt-auto pt-6 lg:hidden">
      <UiDialog v-model:open="isOpen">
        <UiDialogTrigger as-child>
          <UiButton type="button" class="min-h-11 w-full">
            <CartIcon class="w-6 h-6 mr-2" />
            <span class="text-sm font-medium">Add to cart</span>
          </UiButton>
        </UiDialogTrigger>
        <UiDialogContent
          class="!inset-0 !flex !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-5 overflow-y-auto !border-0 rounded-none p-5 sm:!inset-auto sm:!left-1/2 sm:!top-1/2 sm:!grid sm:!h-auto sm:!w-full sm:!max-w-[640px] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-lg sm:!border sm:p-6"
        >
          <UiDialogHeader>
            <UiDialogTitle>Quick buy</UiDialogTitle>
          </UiDialogHeader>
          <p class="text-sm text-muted-foreground">
            Paste one or more manufacturer part numbers from your BOM. Remove any rows you do not need.
          </p>
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
          <p
            v-if="formError"
            class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
            role="alert"
          >
            {{ formError }}
          </p>
          <UiDialogFooter class="mt-auto w-full pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:pb-0">
            <div class="flex gap-2.5 w-full">
              <UiButton variant="secondary" class="min-h-11 min-w-11" aria-label="Add part" @click="addProduct">
                <PlusIcon class="w-5 h-5" aria-hidden="true" />
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
  </section>
</template>
