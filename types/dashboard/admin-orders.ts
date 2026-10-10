import type { OrderInterface } from '~~/types/order-summary/item';
import type { WidgetTypeEnum } from '~~/types/dashboard/orders';

export type WidgetApiType = `${WidgetTypeEnum}`;

export interface WidgetResponse {
  status: string;
  data: {
    total: string | number;
  };
}

export interface PaginatedOrdersResponse {
  status: string;
  data: {
    total_items: number;
    page_count: number;
    page?: number;
    items: OrderInterface[];
  };
}
