import { FirebaseError } from 'firebase/app';
import HttpFactory from '@/composables/HttpFactory';
import type { PaginatedUserRequest } from '~/model/user/request/PaginatedUserRequest';
import type { ProductResponse } from '~/model/products/response/ProductResponse';
import type { AccountAdminSettings, CardsResponse } from '~/types/auth/account-settings';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

class UserService extends HttpFactory {
  private RESOURCE = '/user';

  async fetchPaginatedUser(params: PaginatedUserRequest) {
    return await this.call('GET', `${this.RESOURCE}`, params);
  }

  async resetPasswordLink(email: string): Promise<ProductResponse | FirebaseError | unknown> {
    try {
      return await this.call<{
        status: string;
        data: unknown;
      }>('POST', `${this.RESOURCE}/password/email/reset`, { email: email });
    }
    catch (err) {
      if (err instanceof FirebaseError) {
        return err;
      }
      return err;
    }
  }

  async resetPassword(email: string, newPassword: string, code: string): Promise<ProductResponse | FirebaseError | unknown> {
    try {
      return await this.call('POST', `${this.RESOURCE}/password/reset`, {
        email: email,
        newPassword: newPassword,
        code: code,
      });
    }
    catch (err) {
      if (err instanceof FirebaseError) {
        return err;
      }
      return err;
    }
  }

  async fetchCustomerCredit(_id: string) {
    return await this.call<AccountAdminSettings>('GET', `${this.RESOURCE}/credit`, null);
  }

  async userCards() {
    return await this.call<CardsResponse>('GET', `${this.RESOURCE}/cards`, null);
  }

  async addShippingAsCustomer(address: ShippingAddressInterface) {
    return await this.call<{ status: string; data: string }>('POST', `${this.RESOURCE}/shipping-address/`, { address: address });
  }

  async updateShippingAsCustomer(address: ShippingAddressInterface) {
    return await this.call<{ status: string; data: string }>('PATCH', `${this.RESOURCE}/shipping-address/`, { address: address });
  }

  async deleteShippingAsCustomer(id: string) {
    return await this.call<{
      status: string;
      data: string;
    }>('DELETE', `${this.RESOURCE}/shipping-address/${id}`, null);
  }

  async addBillingAsCustomer(address: ShippingAddressInterface) {
    return await this.call<{ status: string; data: string }>('POST', `${this.RESOURCE}/billing-address/`, { address: address });
  }

  async updateBillingAsCustomer(address: ShippingAddressInterface) {
    return await this.call<{ status: string; data: string }>('PATCH', `${this.RESOURCE}/billing-address/`, { address: address });
  }

  async deleteBillingAsCustomer(id: string) {
    return await this.call<{
      status: string;
      data: string;
    }>('DELETE', `${this.RESOURCE}/billing-address/${id}`, null);
  }
}

export default UserService;
