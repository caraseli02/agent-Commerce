<template>
  <div v-if="modelValue > 0" class="flex bg-stone-50 bg-opacity-95 rounded-lg max-w-max">
    <button
      type="button"
      :disabled="Number(modelValue) === object.min || modelValue === 1"
      class="flex min-h-11 min-w-11 items-center justify-center bg-gray-100 px-2.5 text-slate-500 transition-colors duration-300 disabled:text-border"
      aria-label="Decrease quantity"
      @click="inputHandler(modelValue - 1)"
    >
      <MinusIcon class="w-6 h-6 flex-shrink-0" />
    </button>
    <label :key="modelValue" class="flex">
      <input
        v-if="modelValue > -1"
        :value="Number(modelValue) < object.min && type === OrderType.Stock ? Number(object.min) : Number(modelValue)"
        type="number"
        :min="object.min || 1"
        :max="object.max"
        step="1"
        placeholder="Quantity"
        aria-label="Quantity"
        :aria-invalid="Boolean(inputError)"
        :aria-describedby="inputErrorId"
        class="h-11 w-[56px] bg-transparent px-1 text-center text-sm leading-normal text-neutral-700 placeholder:text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @change="inputHandlerModified"
      />
      <span :id="inputErrorId" class="sr-only" role="alert">{{ inputError }}</span>
    </label>
    <button
      type="button"
      class="flex min-h-11 min-w-11 items-center justify-center bg-gray-100 px-2.5"
      aria-label="Increase quantity"
      :disabled="object.max && props.type !== OrderType.Back ? Number(modelValue) >= object.max : false"
      @click="inputHandler(modelValue + 1)"
    >
      <PlusIcon class="w-6 h-6 flex-shrink-0 text-slate-500" />
    </button>
  </div>
  <UiSkeleton v-if="modelValue === 0" class="w-[140px] h-11" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import PlusIcon from '@/assets/icons/plus.svg';
import MinusIcon from '@/assets/icons/minus.svg';
import { ProductAction, type CartProductsInterface, type ProductActionObject, type UpdateProductCartRequestInterface } from '~~/types/cart';
import { useCart } from '~/composables/useCart';
import { OrderType } from '~~/types';
const { updateCartItem } = useCart();

const props = defineProps({
  modelValue: {
    type: Number,
    required: true,
  },
  size: {
    type: String as PropType<'sm' | 'lg'>,
    required: false,
    default: 'sm',
  },
  object: {
    type: Object as PropType<ProductActionObject>,
    required: false,
    default: {} as ProductActionObject,
  },
  type: {
    type: Number,
    required: false,
    default: undefined,
  },
  updateOnlyAvailableStock: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const inputError = ref('');
const inputErrorId = useId();

const emits = defineEmits(['update:modelValue']);
const inputHandler = async (quantity: number) => {
  // Compare against the bound model — a local "initialQuantity" copy goes stale when
  // the parent resets qty from cart/fetchCart/bulk tiers, which made +/- no-ops on PDP.
  if (quantity === props.modelValue) {
    return;
  }

  if (props.object && props.object.action === ProductAction.Add) {
    const payload = {} as UpdateProductCartRequestInterface;
    let product: CartProductsInterface;
    payload.products = [];

    if (props.type === OrderType.Back) {
      product = {
        id: props.object.id,
        isFolder: false,
        backorder_stock: quantity,
      } as CartProductsInterface;
    } else {
      product = {
        id: props.object.id,
        isFolder: false,
        stock: quantity,
        updateOnlyAvailableStock: props.updateOnlyAvailableStock,
      } as CartProductsInterface;
    }

    payload.products.push(product);

    const object = (await updateCartItem(payload)) as { status?: string };
    if (object.status === 'success') {
      emits('update:modelValue', quantity);
    }
  } else {
    emits('update:modelValue', quantity);
  }
};

const inputHandlerModified = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const min = Number(props.object.min || 1);
  const max = props.object.max ? Number(props.object.max) : Number.MAX_SAFE_INTEGER;
  const quantity = target.valueAsNumber;

  if (!Number.isSafeInteger(quantity) || quantity < min || quantity > max) {
    inputError.value = `Enter a whole number from ${min}${max < Number.MAX_SAFE_INTEGER ? ` to ${max}` : ''}.`;
    target.value = String(props.modelValue);
    return;
  }

  inputError.value = '';
  void inputHandler(quantity);
};

watch(
  () => props.modelValue,
  (newQuantity) => {
    // if (newQuantity < props.object.min && props.type === OrderType.Stock) {
    if (newQuantity < props.object.min) {
      emits('update:modelValue', props.object.min);
    }
  },
  { immediate: true, deep: true },
);
</script>

<!-- <template>
    <div v-if="modelValue > 0" class="flex bg-stone-50 bg-opacity-95 rounded-lg max-w-max">
        <button
            :disabled="Number(modelValue) === object.min || modelValue === 1"
            class="flex items-center justify-center bg-gray-100 text-slate-500 px-2.5 transition-colors duration-300 disabled:text-border"
            :class="[size === 'sm' ? 'w-8 h-9' : 'w-[42px] h-[42px]']"
            @click.once="inputHandler(Number(modelValue) - 1)"
        >
            <MinusIcon class="w-6 h-6 flex-shrink-0" />
        </button>
        <label :key="modelValue" class="flex">
            <input
                v-if="modelValue > -1"
                :value="Number(modelValue) < object.min && type === OrderType.Stock ? Number(object.min) : Number(modelValue)"
                type="number"
                :min="1"
                placeholder="Quantity"
                class="bg-transparent w-[56px] px-1 text-sm leading-normal text-neutral-700 text-center placeholder:text-[12px] focus:outline-none"
                :class="[size === 'sm' ? 'h-9' : 'h-[42px]']"
                @focusout.once="($event) => inputHandlerModified($event)"
                @mouseleave.once="($event) => inputHandlerModified($event)"
            />
        </label>
        <button
            class="flex items-center justify-center bg-gray-100 px-2.5"
            :class="[size === 'sm' ? 'w-8 h-9' : 'w-[42px] h-[42px]']"
            :disabled="object.max && props.type !== OrderType.Back ? Number(modelValue) >= object.max : false"
            @click.once="inputHandler(Number(modelValue) + 1)"
        >
            <PlusIcon class="w-6 h-6 flex-shrink-0 text-slate-500" />
        </button>
    </div>
    <UiSkeleton v-if="modelValue === 0" class="w-[140px] h-[42px]" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import PlusIcon from '@/assets/icons/plus.svg';
import MinusIcon from '@/assets/icons/minus.svg';
import { CartProductsInterface, ProductAction, ProductActionObject } from '~~/types/cart';
import { UpdateProductCartRequestInterface } from '~~/types/cart';
import { useCart } from '~/composables/useCart';
import { OrderType } from '~~/types';
const { updateCartItem } = useCart();

const props = defineProps({
    modelValue: {
        type: Number,
        required: true,
    },
    size: {
        type: String as PropType<'sm' | 'lg'>,
        required: false,
        default: 'sm',
    },
    object: {
        type: Object as PropType<ProductActionObject>,
        required: false,
        default: {} as ProductActionObject,
    },
    type: {
        type: Number,
        required: false,
    },
    updateOnlyAvailableStock: {
        type: Boolean,
        required: false,
        default: false,
    },
});

const currentQuantity = ref(props.modelValue);

const emits = defineEmits(['update:modelValue']);
const inputHandler = async (quantity: number) => {
    if (currentQuantity.value === quantity) {
        return;
    }

    emits('update:modelValue', quantity);

    currentQuantity.value = quantity;
    if (props.object && props.object.action === ProductAction.Update) {
        const payload = {} as UpdateProductCartRequestInterface;
        let product: CartProductsInterface;
        payload.products = [];

        if (props.type === OrderType.Back) {
            product = {
                id: props.object.id,
                isFolder: false,
                backorder_stock: quantity,
            } as CartProductsInterface;
        } else {
            product = {
                id: props.object.id,
                isFolder: false,
                stock: quantity,
                updateOnlyAvailableStock: props.updateOnlyAvailableStock,
            } as CartProductsInterface;
        }

        payload.products.push(product);

        await updateCartItem(payload);
    }
};

const inputHandlerModified = (event: Event) => {
    const target = event.target as HTMLInputElement;

    inputHandler(Number(target.value.replace(/\D+/g, '')));

    if (parseInt(target.value) < props.object.min || !target.value) {
        inputHandler(props.object.min);
    }
};

watch(
    () => props.modelValue,
    (newQuantity) => {
        // if (newQuantity < props.object.min && props.type === OrderType.Stock) {
        if (newQuantity < props.object.min) {
            emits('update:modelValue', props.object.min);
        }
    },
    { immediate: true, deep: true }
);
</script> -->
