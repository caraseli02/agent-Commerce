const GUEST_CHECKOUT_COOKIE = 'guest-checkout-mode';

export function useGuestCheckout() {
  const guestCheckoutMode = useCookie<boolean>(GUEST_CHECKOUT_COOKIE, {
    default: () => false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  });

  const enableGuestCheckout = () => {
    guestCheckoutMode.value = true;
  };

  const clearGuestCheckout = () => {
    guestCheckoutMode.value = false;
  };

  return {
    guestCheckoutMode,
    enableGuestCheckout,
    clearGuestCheckout,
  };
}
