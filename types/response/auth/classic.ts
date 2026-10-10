import type { UserInterface } from '~~/types/auth/user-interface';

export interface SigninResponseData {
  token: string;
  user?: UserInterface;
}

export interface SigninResponse {
  status: string;
  description?: string;
  token?: string;
  user?: UserInterface;
  data?: SigninResponseData;
}
