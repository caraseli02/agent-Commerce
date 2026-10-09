import type { StripeCardInterface } from '~~/types';

export interface AccountAdminSettings {
  discount?: DiscountInterface;
  customerCredit?: CustomerCreditInterface;
  alertsAndNotifications?: AlertsAndNotificationsInterface;
  marketingPreferences?: MarketingPreferencesInterface;
  messagesPreferences?: MessagesPreferencesInterface;
}

export interface MessagesPreferencesInterface {
  messages: AlertsAndNotificationsTypes;
}

export interface AlertsAndNotificationsInterface {
  shoppingCart?: AlertsAndNotificationsTypes;
  newProducts?: AlertsAndNotificationsTypes;
  hotDeals?: AlertsAndNotificationsTypes;
  securityAlerts?: AlertsAndNotificationsTypes;
  passwordChange?: AlertsAndNotificationsTypes;
  pendingAgents?: AlertsAndNotificationsTypes;
  priceChange?: AlertsAndNotificationsTypes;
  outOfStock?: AlertsAndNotificationsTypes;
  shippingUpdates?: AlertsAndNotificationsTypes;
}

export interface MarketingPreferencesInterface {
  cookiesPolicy?: AlertsAndNotificationsTypes;
  newsletter: AlertsAndNotificationsTypes;
  emailMarketing?: AlertsAndNotificationsTypes;
}

export interface CustomerCreditInterface {
  limit: number;
  spent: number;
  available: number;
  dueDate: string;
  tillDue: string;
  term: number;
  freeze: boolean;
  active: boolean;
}

export interface AlertsAndNotificationsTypes {
  email?: boolean;
  app?: boolean;
}

export interface DiscountInterface {
  value: number;
  total?: number;
  startDate: string;
  endDate: string;
}

export enum AlertAndNotificationLabelsEnum {
  newProducts = 'New Products',
  hotDeals = 'HOT Deals',
  outOfStock = 'Out of stock',
  priceChange = 'Prince Change',
  shippingUpdates = 'Shipping Updates',
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  princeChange = 'Prince Change',
  passwordChange = 'Password Change',
  cartItemsOutOfStock = 'Cart Items - Out of Stock',
  cartItemsPriceChange = 'Cart Items - Price Change',
  orderShippingUpdates = 'Order Shipping Updates',
  pendingAgents = 'Pending Agents',
}

export enum MarketingPreferencesEnum {
  cookiesPolicy = 'Cookies Policy Consent',
  newsletter = 'Subscribed to Newsletter',
  eMailMarketing = 'E-mail marketing consent',
}

export interface CardsResponse {
  status: string;
  data: StripeCardInterface[];
}
