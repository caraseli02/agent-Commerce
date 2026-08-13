import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import type { CartInterface, CartProductsInterface } from '~/types/cart';

const cartUnits = (products: CartProductsInterface[] = []) =>
  products.reduce(
    (total, product) => total + Math.max(0, Number(product.stock ?? 0)) + Math.max(0, Number(product.backorder_stock ?? 0)),
    0,
  );

/**
 * Shared header cart badge/icon pulse when items are added (optimistic or reconciled).
 */
export const useCartBadgeMotion = () => {
  const isPulsing = ref(false);
  let lastLineCount = 0;
  let lastUnitCount = 0;
  let pulseTimer: ReturnType<typeof setTimeout> | null = null;
  let hasBaseline = false;

  const clearPulseTimer = () => {
    if (pulseTimer) {
      clearTimeout(pulseTimer);
      pulseTimer = null;
    }
  };

  const scheduleFrame = (callback: () => void) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(callback);
      return;
    }
    setTimeout(callback, 0);
  };

  const triggerPulse = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    isPulsing.value = false;
    scheduleFrame(() => {
      isPulsing.value = true;
      clearPulseTimer();
      pulseTimer = setTimeout(() => {
        isPulsing.value = false;
        pulseTimer = null;
      }, 480);
    });
  };

  const syncFromCart = (cart: CartInterface | null | undefined, { animate = true }: { animate?: boolean } = {}) => {
    const products = cart?.products ?? [];
    const nextLines = products.length;
    const nextUnits = cartUnits(products);

    if (animate && hasBaseline && (nextLines > lastLineCount || nextUnits > lastUnitCount)) {
      triggerPulse();
    }

    lastLineCount = nextLines;
    lastUnitCount = nextUnits;
    hasBaseline = true;
  };

  const resetBaseline = () => {
    lastLineCount = 0;
    lastUnitCount = 0;
    hasBaseline = false;
    isPulsing.value = false;
    clearPulseTimer();
  };

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      clearPulseTimer();
    });
  }

  return {
    isPulsing,
    syncFromCart,
    resetBaseline,
    triggerPulse,
  };
};
