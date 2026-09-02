interface Price {
  total: number;
  noVat: number;
}

export interface ShippingOrderPricingService {
  id: number;
  courierName?: string;
  name?: string;
}

export interface ShippingOrderPricingOption {
  price: Price;
  service: ShippingOrderPricingService;
}

export interface ShippingOrderPricingResponse {
  selected: ShippingOrderPricingOption;
  list: ShippingOrderPricingOption[];
  quote?: {
    currency: 'RON';
    merchandiseTotal: number;
    discountTotal: number;
    shippingTotal: number;
    smallOrderCharge: number;
    vatRate: number;
    vatTotal: number;
    grandTotal: number;
    smallOrderTier: {
      _id?: string;
      min: number;
      max: number;
      price: number;
    } | null;
    lines: Array<{
      productId: string;
      quantity: number;
      listUnitPrice: number;
      discountPercent: number;
      discountTotal: number;
      unitPrice: number;
      lineTotal: number;
      vatTotal: number;
    }>;
  };
}
