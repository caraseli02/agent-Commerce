import type { ProductInterface } from '~/types/product';
import type { DiscountInterface } from '~/types/auth/account-settings';

export enum ProductAction {
  Update = 'update',
  Add = 'add',
}

export interface ProductActionObject {
  action: ProductAction;
  id: string;
  min: number;
  max?: number;
}

export interface CartResponse {
  status: string;
  data: CartInterface;
}

export interface CartInterface {
  _id?: string;
  userId: string;
  products: CartProductsInterface[];
  startDate: string;
  endDate: string;
}

export interface CartProductsInterface {
  /**
   * Product id
   */
  id: string;

  /** Number of pieces wanted for a specific product */
  stock: number;

  /** Number of pieces wanted for a specific product delivered in a back-order */
  backorder_stock?: number;

  /** If set to true, update only the backorder_stock field */
  updateOnlyBackorderStock?: boolean;

  /** If set to true, update only the stock field */
  updateOnlyAvailableStock?: boolean;

  /** Either the sent product is a simple product or a folder ID */
  isFolder: boolean;

  /**
   * Price before unknown discount per unit
   */
  initialUnitPrice: number;

  /**
   * Price after unknown discount per unit
   */
  unitPriceAfterDiscounts: number;

  /**
   * Price after applying shipping and other taxes
   */
  total: number;

  /**
   * Price after applying discounts
   */
  subtotal: number;

  /**
   * Value of the applied discount
   */
  discount: DiscountInterface;

  /** The entire product retrieved from database */
  productEntity?: ProductInterface;

  /** If the product is liked by the user */
  liked?: boolean;

  /** If the product is selected in the UI */
  selected?: boolean;
}
