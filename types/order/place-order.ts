import type { PaymentStatusEnum } from '~/types';

interface PaymentIntentLike {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  next_action?: {
    redirect_to_url?: {
      url?: string;
    };
  };
}

export interface OrderCreateResponse {
  result?: PaymentIntentLike;
  useExistingPaymentMethod: boolean;
  clientSecret?: string;
  status: PaymentStatusEnum;
  orderId: string;
}

export interface PlaceOrderInterface {
  data: OrderCreateResponse;
  status: string;
}
