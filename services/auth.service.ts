import { FirebaseError } from 'firebase/app';
import HttpFactory from '@/composables/HttpFactory';
import type { LoginRequest } from '~/model/auth/request/LoginRequest';
import type { ProductResponse } from '~/model/products/response/ProductResponse';
import type {
  FirebaseBusinessAccount as SignupBusinessPayload,
  FirebasePersonalAccount as SignupPersonalPayload,
  UserDetailsResponse,
} from '~~/types';
import useFirebaseAuth from '~/composables/useFirebaseAuth';

class AuthService extends HttpFactory {
  private RESOURCE = '/auth';

  async login(payload: LoginRequest): Promise<ProductResponse | FirebaseError | unknown> {
    try {
      return await this.call('POST', `${this.RESOURCE}/login`, payload);
    }
    catch (err) {
      if (err instanceof FirebaseError) {
        return err;
      }
      return err;
    }
  }

  async registerFirebase(payload: SignupPersonalPayload | SignupBusinessPayload) {
    const token = await useFirebaseAuth().getUserToken();

    return await this.call(
      'POST',
      `${this.RESOURCE}/firebase/register`,
      payload,
      token
        ? {
            headers: { Authorization: `Bearer ${token}` },
          }
        : {},
    );
  }

  async registerClassic(payload: SignupPersonalPayload | SignupBusinessPayload) {
    return await this.call('POST', `${this.RESOURCE}/register`, payload);
  }

  async verifyEmail(code: string) {
    return await this.call('POST', 'user/email/verify', { code: code });
  }

  async fetchUserDetails(userId: string) {
    return await this.call<UserDetailsResponse>('GET', `user/${userId}/details`, null);
  }
}

export default AuthService;
