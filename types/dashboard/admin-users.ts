import type { UserInterface } from '~/types/auth/user-interface';
import type { TransactionInterface } from '~/types/dashboard/transaction';

export interface PaginatedCustomersInterface {
  status: string;
  data: {
    total_items: number;
    page_count: number;
    page: number;
    items: UserInterface[];
  };
}

export interface PaginatedTransactionsInterface {
  status: string;
  data: {
    total_items: number;
    page_count: number;
    page: number;
    items: TransactionInterface[];
  };
}

export interface TotalCustomersInterface {
  status: string;
  data: {
    series: {
      data: number[];
    }[];
    total: number;
    delta: number;
  };
}

export type ReturningCustomersInterface = TotalCustomersInterface;

export interface NewCustomersInterface {
  status: string;
  data: UserInterface[];
}

export interface CustomersByCountryInterface {
  status: string;
  data: {
    label: string;
    count: number;
    theme: string;
  }[];
}
