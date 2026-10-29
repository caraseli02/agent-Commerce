import { PaymentTypeEnum } from '~~/types/order-summary/item';

// Buyer availability is independent from demo account/catalog configuration.
// Keep dormant methods visible and historical payment values unchanged.
export const unavailablePaymentMethodMessage = 'Temporarily unavailable';
export const isBuyerCheckoutPaymentType = (value: unknown): value is PaymentTypeEnum.Card => value === PaymentTypeEnum.Card;
