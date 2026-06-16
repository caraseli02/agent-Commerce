import { PaymentTypeEnum, type OrderInterface, type PaymentInfo, type StripeCardInterface } from '~/types';
import type { UserInterface } from '~/types/auth/user-interface';

export const paymentInfoHelper = (
  order: OrderInterface,
  userDetails: UserInterface,
  _userCards: StripeCardInterface[],
): PaymentInfo | null => {
  const creditInfo = userDetails.adminSettings?.customerCredit;

  switch (order.paymentDetails?.type) {
    case PaymentTypeEnum.Card: {
      return {
        type: PaymentTypeEnum.Card,
        info: {
          provider: order.paymentDetails.card?.card?.display_brand ?? order.paymentDetails.card?.card?.brand ?? '',
          last4: order.paymentDetails.card?.card?.last4 ?? '',
        },
      };
    }
    case PaymentTypeEnum.Credit: {
      if (creditInfo === undefined) return null;

      return {
        type: PaymentTypeEnum.Credit,
        info: {
          limit: creditInfo.limit,
          tillDue: creditInfo.tillDue,
          term: creditInfo.term,
          spent: creditInfo.spent,
          dueDate: creditInfo.dueDate,
          available: creditInfo.available,
          freeze: creditInfo.freeze,
          active: creditInfo.active,
        },
      };
    }
    case PaymentTypeEnum.Bank: {
      return {
        type: PaymentTypeEnum.Bank,
        info: {
          text: 'Bank transfer',
        },
      };
    }
    case PaymentTypeEnum.Cash: {
      return {
        type: PaymentTypeEnum.Cash,
        info: {
          text: 'Cash on delivery',
        },
      };
    }
    default:
      return {
        type: PaymentTypeEnum.Bank,
        info: {
          text: 'N/A',
        },
      };
  }
};
