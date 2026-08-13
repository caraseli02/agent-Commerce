import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartBadgeMotion } from '../composables/useCartBadgeMotion';
import type { CartInterface } from '~/types/cart';

describe('useCartBadgeMotion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });

  it('pulses when line count or unit quantity increases after baseline', () => {
    const { isPulsing, syncFromCart } = useCartBadgeMotion();

    syncFromCart(
      {
        products: [{ id: 'a', stock: 1 }],
      } as CartInterface,
      { animate: false },
    );
    expect(isPulsing.value).toBe(false);

    syncFromCart({
      products: [
        { id: 'a', stock: 1 },
        { id: 'b', stock: 1 },
      ],
    } as CartInterface);
    expect(isPulsing.value).toBe(true);

    vi.advanceTimersByTime(500);
    expect(isPulsing.value).toBe(false);

    syncFromCart({
      products: [
        { id: 'a', stock: 2 },
        { id: 'b', stock: 1 },
      ],
    } as CartInterface);
    expect(isPulsing.value).toBe(true);
  });

  it('does not pulse when cart shrinks', () => {
    const { isPulsing, syncFromCart } = useCartBadgeMotion();

    syncFromCart(
      {
        products: [
          { id: 'a', stock: 2 },
          { id: 'b', stock: 1 },
        ],
      } as CartInterface,
      { animate: false },
    );

    syncFromCart({
      products: [{ id: 'a', stock: 1 }],
    } as CartInterface);

    expect(isPulsing.value).toBe(false);
  });
});
