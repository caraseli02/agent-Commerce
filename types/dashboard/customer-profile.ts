import type { UserInterface } from '~/types/auth/user-interface';
import type { ApiSuccessResponse } from '~/types/api/response';
import type { TransactionInterface } from '~/types/dashboard/transaction';

export type CustomerProfileUser = UserInterface & { lastActivityDate?: string };

export type CustomerInformationResponse = ApiSuccessResponse<CustomerProfileUser>;

export interface CustomerRecentTransactionsResponse {
  status: string;
  data: TransactionInterface[];
}
