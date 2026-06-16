import type { CustomersProfileInformation } from '~/model/dashboard/customer-information/customer-information';
import HttpFactory from '~/composables/HttpFactory';
import type { OrderInterface } from '~/types';

class CustomerProfileService extends HttpFactory {
  private RESOURCE = '/user';
  private MAIN_RESOURCE = '/dashboard/profile';

  async fetchCustomerInformation(userID: string) {
    return await this.call<CustomersProfileInformation>('GET', `${this.MAIN_RESOURCE}/${userID}/customer-information`, null);
  }

  async fetchCustomerLastOrder(userID: string) {
    return await this.call<unknown>('GET', `${this.MAIN_RESOURCE}/${userID}/last-order`, null);
  }

  async fetchCustomerTotalSpent(userID: string) {
    return await this.call<unknown>('GET', `${this.MAIN_RESOURCE}/${userID}/total-spent`, null);
  }

  async fetchCustomerAvgOrderValue(userID: string) {
    return await this.call<unknown>('GET', `${this.MAIN_RESOURCE}/${userID}/average-order`, null);
  }

  async fetchCustomerAbandonedCheckout(userID: string) {
    return await this.call<unknown>('GET', `${this.MAIN_RESOURCE}/${userID}/abandoned-checkout`, null);
  }

  async fetchCustomerShippingInformation(userID: string) {
    return await this.call<unknown>('GET', `${this.MAIN_RESOURCE}/${userID}/shipping-information`, null);
  }

  async fetchCustomerRecentTransactions(userID: string) {
    return await this.call<OrderInterface[]>('GET', `${this.MAIN_RESOURCE}/${userID}/recent-transactions`, null);
  }
}

export default CustomerProfileService;
