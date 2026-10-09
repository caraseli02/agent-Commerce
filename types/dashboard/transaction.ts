import type { PaymentStatusEnum, PaymentTypeEnum } from '~~/types';

export interface TransactionInterface {
  _id: string;
  shortId: string;
  orderId: string;
  orderShortId: string;
  user: string;
  invoiceId?: string;
  invoiceShortId?: string;
  amount: number;
  type: PaymentTypeEnum;
  status: PaymentStatusEnum;
  createdAt: string;
  updatedAt: string;
  checked?: boolean;
}
