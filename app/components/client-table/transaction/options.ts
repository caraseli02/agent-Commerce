import { getPaymentStatusById, getPaymentTypeById, PaymentStatusEnum, PaymentTypeEnum } from '~/types/order-summary/item';
import type { PaymentStatusOption, PaymentTypeOption } from '~/types/order-summary/item';

export const paymentTypeOptions: PaymentTypeOption[] = [
  { label: getPaymentTypeById(PaymentTypeEnum.Card), value: PaymentTypeEnum.Card, color: 'bg-green-600' },
  { label: getPaymentTypeById(PaymentTypeEnum.Credit), value: PaymentTypeEnum.Credit, color: 'bg-blue-500' },
  { label: getPaymentTypeById(PaymentTypeEnum.Cash), value: PaymentTypeEnum.Cash, color: 'bg-neutral-700' },
  { label: getPaymentTypeById(PaymentTypeEnum.Bank), value: PaymentTypeEnum.Bank, color: 'bg-neutral-700' }, // I've changed 'Bank' to 'Bank Transfer' for clarity
];

export const paymentStatusOptions: PaymentStatusOption[] = [
  {
    label: getPaymentStatusById(PaymentStatusEnum.Pending),
    value: PaymentStatusEnum.Pending,
    color: 'bg-orange-600',
  },
  { label: getPaymentStatusById(PaymentStatusEnum.Paid), value: PaymentStatusEnum.Paid, color: 'bg-green-600' },
  {
    label: getPaymentStatusById(PaymentStatusEnum.Canceled),
    value: PaymentStatusEnum.Canceled,
    color: 'bg-rose-500',
  },
  {
    label: getPaymentStatusById(PaymentStatusEnum.Declined),
    value: PaymentStatusEnum.Declined,
    color: 'bg-rose-500',
  },
];
