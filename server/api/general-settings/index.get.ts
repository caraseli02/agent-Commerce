import { PaymentTypeEnum } from '~~/types/order-summary/item';
import { catalog } from '~~/server/domain/catalog';

export default defineEventHandler(async (_event) => {
  return {
    status: 'success',
    data: {
      layoutSettings: {
        _id: 'layout-001',
      },
      orderSettings: {
        deliveryTypes: [
          {
            _id: 'del-001',
            stripeId: 'ship_standard',
            title: 'Standard Delivery',
            min: 1,
            max: 5,
            unit: 'business_day',
            price: 9.99,
            active: true,
          },
          {
            _id: 'del-002',
            stripeId: 'ship_express',
            title: 'Express Delivery',
            min: 1,
            max: 2,
            unit: 'business_day',
            price: 14.99,
            active: true,
          },
          {
            _id: 'del-003',
            stripeId: 'ship_premium',
            title: 'Premium Delivery',
            min: 1,
            max: 10,
            unit: 'business_day',
            price: 24.99,
            active: true,
          },
        ],
        backorderShippingTypes: [
          {
            _id: 'back-001',
            title: 'Backorder Standard',
            description: 'Standard shipping for backorder items',
            active: true,
          },
        ],
        stockorderShippingTypes: [
          {
            _id: 'stock-001',
            title: 'Stock Order Standard',
            description: 'Standard shipping for stock order items',
            active: true,
          },
        ],
        paymentMethods: [
          {
            _id: 'pay-001',
            type: PaymentTypeEnum.Card,
          },
          {
            _id: 'pay-002',
            type: PaymentTypeEnum.Credit,
          },
          {
            _id: 'pay-003',
            type: PaymentTypeEnum.Cash,
          },
          {
            _id: 'pay-004',
            type: PaymentTypeEnum.Bank,
          },
        ],
        smallOrderCharge: catalog.smallOrderTiers,
      },
      productSettings: {
        _id: 'prod-set-001',
      },
      shopSettings: {
        backorderThreshold: {
          _id: 'thresh-001',
          value: 100,
          active: true,
        },
      },
    },
  };
});
