import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUser } from './useUser';
import { useRuntimeConfig } from '#app';
import { useCartStore } from '~/store/cartStore';
import { AccountRole, AccountType, PaymentTypeEnum } from '~/types';
import type { OrderRequestInterface, PaymentDetails, OrderType } from '~/types';
import type { PlaceOrderInterface } from '~/model/order/response/PlaceOrder';
import type { CartProductsInterface } from '~/model/cart/response/cart.interface';
import type { BackorderShippingTypesInterface, SmallOrderChargeInterface } from '~/types/general-settings/general-settings';
import type { ShippingOrderPricingOption } from '~/types/order-summary/shipping-services';
import { useCheckoutStore } from '~/store/checkoutStore';
import { toast } from '~/components/ui/toast';
import { sendOrder, validateAddress } from '~/composables/api/orders';

interface AddressValidationResponse {
  data: {
    valid: boolean;
  };
}

interface CheckoutOrderSummary {
  products?: CartProductsInterface[];
  subtotal?: number;
  total?: number;
}

export function useOrder() {
  const router = useRouter();
  const config = useRuntimeConfig();
  const { user, getShipping, getBilling } = useUser();
  const cartStore = useCartStore();
  const checkoutStore = useCheckoutStore();
  const { checkout } = storeToRefs(checkoutStore);
  const orderRequestObject = ref<OrderRequestInterface>({} as OrderRequestInterface);

  type CheckoutFailure = {
    message?: string;
    type?: string;
    code?: string;
  };

  const checkoutFailPath = { path: '/checkout/fail' } as const;

  const goToCheckoutFail = async (error: CheckoutFailure) => {
    cartStore.setPreviousCheckoutError(error);
    await router.push(checkoutFailPath);
  };

  const buildCheckoutFailure = (
    response: { status?: string; message?: string; data?: unknown } | null | undefined,
    fallbackMessage: string,
    fallbackType: string
  ): CheckoutFailure => {
    const data = ((response?.data ?? {}) as {
      message?: unknown;
      type?: unknown;
      code?: unknown;
      error?: unknown;
      errorCode?: unknown;
      status?: unknown;
      result?: { status?: unknown };
    });
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
    if (!user.value || !user.value?.contactDetails || !deliveryMethod || !paymentDetails) {
      checkout.value = false;
      return;
    }

    if (user.value.role === AccountRole.Client) {
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
          address: getShipping(),
          billingAddress: getBilling(),
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
        await handleOrderResponse(response, orderId, paymentDetails.type);
      }
    } catch (error) {
      console.error('Checkout failed', error);
      await goToCheckoutFail(buildCheckoutException(error));
    } finally {
      await cartStore.updateAndReturnCart();
      checkout.value = false;
    }
  };

  const handleOrderResponse = async (response: PlaceOrderInterface, orderId: string, paymentType: PaymentTypeEnum) => {
    if (config.public.MOCK_MODE) {
      await router.push({ path: '/checkout/success', query: { id: orderId } });
      return;
    }

    if (paymentType === PaymentTypeEnum.Card) {
      const result = response.data.result;

      if (!result) {
        if (response.data.clientSecret) {
          cartStore.setOrderClientSecret(response.data.clientSecret);
        }
        await router.push({ path: '/checkout/session', query: { id: orderId } });
        return;
      }

      switch (result.status) {
        case 'succeeded':
          if (orderId) {
            await router.push({ path: '/order-summary/' + orderId, query: { new: 'true' } });
          }
          break;
        case 'canceled':
          await goToCheckoutFail({
            message: 'Payment was canceled. Please try again.',
            type: 'payment_canceled',
            code: 'canceled',
          });
          break;
        case 'requires_action':
          if (result.next_action?.redirect_to_url?.url) {
            window.location.href = result.next_action.redirect_to_url.url;
          }
          break;
        case 'requires_payment_method':
          await router.push({ path: '/checkout/session' });
          break;
        default:
          await router.push({ path: '/order-summary/' + orderId, query: { new: 'true' } });
          break;
      }
    } else if (paymentType === PaymentTypeEnum.Credit || paymentType === PaymentTypeEnum.Bank || paymentType === PaymentTypeEnum.Cash) {
      await router.push({ path: '/order-summary/' + orderId, query: { new: 'true' } });
    }
  };

  return { makeCheckout };
}
