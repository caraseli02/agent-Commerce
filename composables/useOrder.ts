import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUser } from './useUser';
import { useRuntimeConfig } from '#app';
import { useCartStore } from '~/store/cartStore';
import { AccountRole, AccountType, PaymentTypeEnum } from '~/types';
import type { OrderRequestInterface, PaymentDetails, OrderType } from '~/types';
import type { PlaceOrderInterface } from '~/types/order';
import type { CartProductsInterface } from '~/types/cart';
import type { BackorderShippingTypesInterface, SmallOrderChargeInterface } from '~/types/general-settings/general-settings';
import type { ShippingOrderPricingOption } from '~/types/order-summary/shipping-services';
import { useCheckoutStore } from '~/store/checkoutStore';
import { toast } from '~/components/ui/toast';
import { sendOrder, validateAddress } from '~/composables/api/orders';
import { resolveCheckoutOutcome, type CheckoutFailure, type CheckoutOutcome } from '~/helpers/checkout-outcome';
import { isCompleteGuestContact, isCompleteSavedAddress } from '~/helpers/address.helper';
import type { GuestCheckoutContact } from '~/types/order-summary/item';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

interface AddressValidationResponse {
  data: {
    valid: boolean;
  };
}

interface CheckoutOrderSummary {
  products?: CartProductsInterface[];
  subtotal?: number;
  total?: number;
  guestContact?: GuestCheckoutContact | null;
  shippingDetails?: {
    address: ShippingAddressInterface | null;
    billingAddress: ShippingAddressInterface | null;
  };
}

export function useOrder() {
  const router = useRouter();
  const config = useRuntimeConfig();
  const { user, getShipping, getBilling } = useUser();
  const cartStore = useCartStore();
  const checkoutStore = useCheckoutStore();
  const { checkout } = storeToRefs(checkoutStore);
  const orderRequestObject = ref<OrderRequestInterface>({} as OrderRequestInterface);

  const checkoutFailPath = { path: '/checkout/fail' } as const;

  const goToCheckoutFail = async (error: CheckoutFailure) => {
    cartStore.setPreviousCheckoutError(error);
    await router.push(checkoutFailPath);
  };

  const applyCheckoutOutcome = async (outcome: CheckoutOutcome) => {
    switch (outcome.kind) {
      case 'success':
        if (!outcome.orderId?.trim()) {
          await goToCheckoutFail({
            message: 'Checkout completed without a valid order ID. Please try again.',
            type: 'invalid_order_id',
            code: 'missing_order_id',
          });
          break;
        }
        if (outcome.destination === 'checkout-success') {
          await router.push({ path: '/checkout/success', query: { id: outcome.orderId } });
        } else {
          await router.push({ path: '/order-summary/' + outcome.orderId, query: { new: 'true' } });
        }
        break;
      case 'session':
        if (outcome.clientSecret) {
          cartStore.setOrderClientSecret(outcome.clientSecret);
        }
        await router.push(outcome.orderId ? { path: '/checkout/session', query: { id: outcome.orderId } } : { path: '/checkout/session' });
        break;
      case 'fail':
        await goToCheckoutFail(outcome.error);
        break;
      case 'redirect':
        window.location.href = outcome.url;
        break;
      case 'noop':
        break;
    }
  };

  const buildCheckoutFailure = (
    response: { status?: string; message?: string; data?: unknown } | null | undefined,
    fallbackMessage: string,
    fallbackType: string
  ): CheckoutFailure => {
    const data = (response?.data ?? {}) as {
      message?: unknown;
      type?: unknown;
      code?: unknown;
      error?: unknown;
      errorCode?: unknown;
      status?: unknown;
      result?: { status?: unknown };
    };
    const messageCandidate = data.message ?? data.error ?? response?.message;
    const message = typeof messageCandidate === 'string' && messageCandidate.trim() ? messageCandidate : fallbackMessage;

    return {
      message,
      type: typeof data.type === 'string' && data.type ? data.type : response?.status ?? fallbackType,
      code:
        (typeof data.code === 'string' && data.code ? data.code : undefined) ??
        (typeof data.errorCode === 'string' && data.errorCode ? data.errorCode : undefined) ??
        (typeof data.status === 'string' && data.status ? data.status : undefined) ??
        (typeof data.result?.status === 'string' && data.result.status ? data.result.status : undefined),
    };
  };

  const buildCheckoutException = (error: unknown): CheckoutFailure => {
    if (error instanceof Error) {
      return {
        message: error.message || 'Unable to complete checkout. Please try again.',
        type: error.name || 'checkout_exception',
        code: error.name || 'checkout_exception',
      };
    }

    return {
      message: 'Unable to complete checkout. Please try again.',
      type: 'checkout_exception',
      code: typeof error === 'string' && error ? error : 'unknown_error',
    };
  };

  const makeCheckout = async (
    orderType: OrderType,
    cartId: string,
    deliveryMethod: ShippingOrderPricingOption | null,
    backOrderOption: BackorderShippingTypesInterface | null,
    smallOrder: SmallOrderChargeInterface | null,
    paymentDetails: PaymentDetails,
    note: string,
    orderSummary?: CheckoutOrderSummary
  ) => {
    const guestContact = orderSummary?.guestContact;
    const draftShippingAddress = orderSummary?.shippingDetails?.address ?? null;
    const draftBillingAddress = orderSummary?.shippingDetails?.billingAddress ?? null;
    const isGuestCheckout = Boolean(guestContact) && !user.value?.contactDetails;

    if (!deliveryMethod || !paymentDetails) {
      checkout.value = false;
      return;
    }

    if (isGuestCheckout) {
      if (
        !isCompleteGuestContact(guestContact) ||
        !isCompleteSavedAddress(draftShippingAddress) ||
        !isCompleteSavedAddress(draftBillingAddress)
      ) {
        checkout.value = false;
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please complete your contact and address details before checkout.',
        });
        return;
      }

      orderRequestObject.value = {
        isDraft: false,
        cartId: cartId,
        currency: 'ron',
        type: orderType,
        products: orderSummary?.products ?? [],
        subtotal: Number(orderSummary?.subtotal || 0),
        total: Number(orderSummary?.total || 0),
        shippingCost: Number(deliveryMethod.price?.total || 0),
        shippingDetails: {
          firstName: guestContact.firstName,
          lastName: guestContact.lastName,
          city: draftShippingAddress.city,
          country: draftShippingAddress.country,
          phone: guestContact.phone,
          email: guestContact.email,
          address: draftShippingAddress,
          billingAddress: draftBillingAddress,
          deliveryTypeId: deliveryMethod.service?.id?.toString() ?? '',
          stockorderShippingType: deliveryMethod,
          backorderShippingTypeId: backOrderOption?._id,
        },
        smallOrderChargeId: smallOrder?._id,
        paymentDetails: {
          type: paymentDetails.type,
        },
      } as OrderRequestInterface;

      if (paymentDetails.type === PaymentTypeEnum.Card) {
        orderRequestObject.value.stripeCardId = paymentDetails.card?.id || null;
      }

      if (note) {
        orderRequestObject.value.notes = [
          {
            sender: 'guest-checkout',
            message: note,
          },
        ];
      }
    } else if (!user.value || !user.value?.contactDetails) {
      checkout.value = false;
      return;
    } else if (user.value.role === AccountRole.Client) {
      const isPersonalAccount = user.value.accountType === AccountType.Personal;
      const nameDetails = isPersonalAccount
        ? {
            firstName: user.value.personalDetails?.firstName,
            lastName: user.value.personalDetails?.lastName,
            city: user.value.personalDetails?.address.city,
            country: user.value.personalDetails?.address.country,
          }
        : {
            firstName: user.value.contactDetails?.firstName,
            lastName: user.value.contactDetails?.lastName,
            city: user.value.companyDetails?.address.city,
            country: user.value.companyDetails?.address.country,
          };

      const shippingAddress = getShipping();
      const billingAddress = getBilling();

      if (!isCompleteSavedAddress(shippingAddress) || !isCompleteSavedAddress(billingAddress)) {
        checkout.value = false;
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please add your shipping and billing addresses before checkout.',
        });
        return;
      }

      orderRequestObject.value = {
        isDraft: false,
        cartId: cartId,
        currency: 'ron',
        type: orderType,
        products: orderSummary?.products ?? [],
        subtotal: Number(orderSummary?.subtotal || 0),
        total: Number(orderSummary?.total || 0),
        shippingCost: Number(deliveryMethod.price?.total || 0),
        shippingDetails: {
          firstName: nameDetails.firstName ?? '',
          lastName: nameDetails.lastName ?? '',
          city: nameDetails.city ?? '',
          country: nameDetails.country ?? '',
          phone: user.value.contactDetails.phone,
          address: shippingAddress,
          billingAddress: billingAddress,
          deliveryTypeId: deliveryMethod.service?.id?.toString() ?? '',
          stockorderShippingType: deliveryMethod,
          backorderShippingTypeId: backOrderOption?._id,
        },
        smallOrderChargeId: smallOrder?._id,
        paymentDetails: {
          type: paymentDetails.type,
        },
      } as OrderRequestInterface;

      if (paymentDetails.type === PaymentTypeEnum.Card) {
        orderRequestObject.value.stripeCardId = paymentDetails.card?.id || null;
      }

      if (note) {
        orderRequestObject.value.notes = [
          {
            sender: user.value.firebaseId ?? '',
            message: note,
          },
        ];
      }
    }

    if (!orderRequestObject.value.shippingDetails?.address || !orderRequestObject.value.shippingDetails?.billingAddress) {
      checkout.value = false;
      return;
    }

    const resultShipping = (await validateAddress({
      country: orderRequestObject.value.shippingDetails.address.country,
      region: orderRequestObject.value.shippingDetails.address.region,
      city: orderRequestObject.value.shippingDetails.address.city,
      postcode: orderRequestObject.value.shippingDetails.address.postcode,
      name1: orderRequestObject.value.shippingDetails.address.name1,
      name2: orderRequestObject.value.shippingDetails.address.name2,
      default: false,
    })) as AddressValidationResponse;

    const resultBilling = (await validateAddress({
      country: orderRequestObject.value.shippingDetails.billingAddress.country,
      region: orderRequestObject.value.shippingDetails.billingAddress.region,
      city: orderRequestObject.value.shippingDetails.billingAddress.city,
      postcode: orderRequestObject.value.shippingDetails.billingAddress.postcode,
      name1: orderRequestObject.value.shippingDetails.billingAddress.name1,
      name2: orderRequestObject.value.shippingDetails.billingAddress.name2,
      default: false,
    })) as AddressValidationResponse;

    if (!resultShipping.data.valid || !resultBilling.data.valid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `${!resultBilling.data.valid ? 'Billing' : 'Shipping'} address is invalid`,
      });
      return;
    }

    try {
      const response = (await sendOrder(orderRequestObject.value)) as PlaceOrderInterface;

      if (response.status !== 'success') {
        await goToCheckoutFail(buildCheckoutFailure(response, 'Unable to complete checkout. Please try again.', 'checkout_failed'));
      } else {
        const orderId = response.data.orderId;
        const outcome = resolveCheckoutOutcome(response, orderId, paymentDetails.type, {
          mockMode: Boolean(config.public.MOCK_MODE),
        });
        await applyCheckoutOutcome(outcome);
      }
    } catch (error) {
      console.error('Checkout failed', error);
      await goToCheckoutFail(buildCheckoutException(error));
    } finally {
      await cartStore.updateAndReturnCart();
      checkout.value = false;
    }
  };

  return { makeCheckout };
}
