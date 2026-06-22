import HttpFactory from '~/composables/HttpFactory';
import type { PaginatedCustomersInterface } from '~/model/dashboard/response/CustomerInterfaceResponse';
import type { OrderStatus, MarkAsPaidRequestInterface, OrderRequestInterface } from '~/types';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

class OrdersService extends HttpFactory {
  private ORDERS_DASHBOARD_RESOURCE = '/dashboard/orders/admin';
  private ORDERS_RESOURCE = '/orders';

  async fetchWidget(type: 'string', time: number) {
    return await this.call<unknown>('GET', `${this.ORDERS_DASHBOARD_RESOURCE}/${type}?time=${time}`, null);
  }

  async fetchOrders(page: number, perPage: number, filters = {}, sort = {}) {
    return await this.call<PaginatedCustomersInterface>('GET', this.ORDERS_RESOURCE, null, {
      params: {
        page: page,
        perPage: perPage,
        ...filters,
        ...sort,
      },
    });
  }

  async sendOrder(order: OrderRequestInterface) {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/new`, { ...order });
  }

  async createAndRetrieveSetupIntent() {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/setup-intent/new`, null);
  }

  async getOrderById(id: string) {
    return await this.call<unknown>('GET', `${this.ORDERS_RESOURCE}/${id}`, null);
  }

  async getShippingPricesForOrder(order: unknown) {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/price`, { order });
  }

  async validateAddress(address: ShippingAddressInterface) {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/validate-address`, { ...address });
  }

  async cancelOrder(id: string) {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/${id}/cancel`, null);
  }

  async markAsPaid(id: string, payload: MarkAsPaidRequestInterface) {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/${id}/paid`, payload);
  }

  async changeStatus(id: string, status: OrderStatus) {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/${id}`, { status });
  }

  async retryFailedShippingOrders(id: string) {
    return await this.call<unknown>('POST', `${this.ORDERS_RESOURCE}/${id}/shipping/retry`, null);
  }

  async getCustomerOrders() {
    return await this.call<unknown>('GET', `${this.ORDERS_RESOURCE}?page=1&perPage=0`, null);
  }
}

export default OrdersService;
