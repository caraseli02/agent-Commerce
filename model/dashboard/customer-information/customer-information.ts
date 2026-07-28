import type { AddressInterface } from '~/types/auth/user-interface';
import type { AccountRole } from '~/types';
import type { ProductInterface } from '~/model/products/response/ProductResponse';

export interface CustomersProfileInformation {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  phone: number;
  address: AddressInterface[];
  role: AccountRole;
  companyName?: string;
}

export interface ActiveOrdersResponse {
  status: string;
  data: ActiveOrders;
}

export interface ActiveOrders {
  total: ActiveOrder[];
}

export interface ActiveOrder {
  _id: string;
  shortId: string;
}

export interface FavoritesResponse {
  status: string;
  data: FavoritesItems;
}

export interface FavoritesItems {
  folders_number: number;
  products_number: number;
}

export interface TotalOrdersResponse {
  status: string;
  data: TotalOrders;
}

export interface TotalOrders {
  total_orders: number;
  total_orders_current_month: number;
}

export interface TotalReturnsResponse {
  status: string;
  data: TotalReturns;
}

export interface TotalReturns {
  total: number;
}

export interface CustomerDashboardActivityData {
  returns: number;
  totalOrders: number;
  monthOrder: number;
  favorites: {
    products: number;
    folders: number;
  };
}

export interface DetailsResponse {
  status: string;
  data: unknown;
}

export interface RecentlyBoughtResponse {
  status: string;
  data: unknown;
}

export interface ViewHistoryResponse {
  status: string;
  data: ViewHistoryProductInterface[];
}

export interface ViewHistoryProductInterface {
  productId: string;
  count: number;
  _id: string;
  createdAt: string;
  updatedAt: string;
  productInfo: ProductInterface;
}

export interface MonthHotSaleResponse {
  status: string;
  data: ProductInterface[];
}

export interface ProductBannerInterface {
  title: string;
  discount: string;
  productCode: string;
  description: string;
  details: string;
  originalPrice: string;
  salePrice: string;
  quantity: number;
  /** Available sellable stock for clamp — not the add quantity. */
  availableStock?: number;
  addToCartText: string;
  _id?: string;
}
