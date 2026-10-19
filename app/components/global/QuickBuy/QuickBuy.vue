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
const partList = ref('');
const importMessage = ref('');
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

const importPartList = () => {
  formError.value = '';
  importMessage.value = '';
  const parsedRows = partList.value
    .split(/\r?\n/)
    .map((line) => line.split(/[\t,;]/).map((cell) => cell.trim().replace(/^"|"$/g, '')))
    .filter(([code]) => code && !/^(mpn|manufacturer part number|part number|sku|item)$/i.test(code))
    .map(([code, quantity]) => ({ code: code!, quantityText: quantity ?? '' }));

  if (!parsedRows.length) {
    formError.value = 'Paste one part number per line to import your parts list.';
    return;
  }

  const invalidQuantity = parsedRows.find(({ quantityText }) => {
    if (!quantityText) return false;
    if (!/^\d+$/.test(quantityText)) return true;
    return !Number.isSafeInteger(Number(quantityText)) || Number(quantityText) < 1;
  });

  if (invalidQuantity) {
    formError.value = `Quantity for ${invalidQuantity.code} must be a positive whole number within the safe range.`;
    return;
  }

  const parsedParts = parsedRows.map(({ code, quantityText }) => ({ code, quantity: quantityText ? Number(quantityText) : 1 }));
  const enteredProducts = products.value.filter((product) => product.code.trim());
  products.value = [...enteredProducts, ...parsedParts];
  partList.value = '';
  hasSubmitted.value = false;
  importMessage.value = `${parsedParts.length} ${parsedParts.length === 1 ? 'part' : 'parts'} added from your pasted list.`;
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
  <section class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] md:p-6">
    <div class="flex items-start gap-3">
      <QuickBuyIcon class="mt-0.5 h-9 w-9 shrink-0" />
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Quick Buy</h2>
        <p class="mt-1 text-sm leading-5 text-slate-500">
          Have a part list ready? Add manufacturer part numbers and quantities directly to your cart.
        </p>
      </div>
    </div>
    <div
      v-if="successMessage"
      class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
      role="status"
      aria-live="polite"
    >
      {{ successMessage }}
      <NuxtLink to="/cart" class="ml-1 font-semibold underline underline-offset-2 hover:text-emerald-950">View cart</NuxtLink>
    </div>
    <form class="mt-5 hidden min-h-0 flex-1 flex-col lg:flex" @submit.prevent="addToCart">
      <details class="mb-3 rounded-lg border border-slate-200 px-3 py-2">
        <summary class="cursor-pointer text-sm font-medium text-slate-700">Paste a parts list</summary>
        <div class="mt-2">
          <UiLabel for="quick-buy-part-list-desktop" class="mb-1 block text-sm font-medium text-slate-800"
            >Part numbers and optional quantities</UiLabel
          >
          <UiTextarea id="quick-buy-part-list-desktop" v-model="partList" class="min-h-20 bg-white" placeholder="STM32F407VGT6, 5" />
          <UiButton type="button" variant="secondary" class="mt-2 min-h-10" @click="importPartList">Import and review</UiButton>
        </div>
      </details>
      <p v-if="importMessage" class="mb-3 text-sm text-emerald-700" role="status" aria-live="polite">{{ importMessage }}</p>
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
      <p v-if="formError" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
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
          <p class="text-sm text-slate-500">Paste one or more manufacturer part numbers from your BOM. Remove any rows you do not need.</p>
          <details class="rounded-lg border border-slate-200 px-3 py-2">
            <summary class="cursor-pointer text-sm font-medium text-slate-700">Paste a parts list</summary>
            <div class="mt-2">
              <UiLabel for="quick-buy-part-list-mobile" class="mb-1 block text-sm font-medium text-slate-800"
                >Part numbers and optional quantities</UiLabel
              >
              <UiTextarea id="quick-buy-part-list-mobile" v-model="partList" class="min-h-24 bg-white" placeholder="STM32F407VGT6, 5" />
              <UiButton type="button" variant="secondary" class="mt-2 min-h-10" @click="importPartList">Import and review</UiButton>
            </div>
          </details>
          <p v-if="importMessage" class="text-sm text-emerald-700" role="status" aria-live="polite">{{ importMessage }}</p>
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
          <UiDialogFooter class="mt-auto w-full pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:pb-0">
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
  </section>
</template>
