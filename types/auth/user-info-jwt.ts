import type { UserPermissionsEnum } from '~~/types/auth/permissions';

export interface UserInfoJWT {
  aud: string;
  auth_time: number;
  email: string;
  email_verified: boolean;
  exp: number;
  firebase: Firebase;
  iat: number;
  iss: string;
  name: string;
  picture: string;
  sub: string;
  user_id: string;
  permissions: UserPermissionsEnum[];
}

interface Firebase {
  identities: Identities;
  sign_in_provider: string;
}

interface Identities {
  email: [string];
  'google.com': [string];
}
