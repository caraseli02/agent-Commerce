import HttpFactory from '~/composables/HttpFactory';
import type {
    ActiveOrdersResponse,
    FavoritesResponse,
    MonthHotSaleResponse,
    RecentlyBoughtResponse,
    TotalOrdersResponse,
    TotalReturnsResponse,
    ViewHistoryResponse,
} from '~/model/dashboard/customer-information/customer-information';
import type { UserDetailsResponse } from '~/types';

class CustomerDashboard extends HttpFactory {
    private RESOURCE = '/dashboard';
    private MAIN_RESOURCE = '/dashboard/client';
    private ORDERS_RESOURCE = '/dashboard/client/orders';

    async fetchCustomerActiveOrders() {
        return await this.call<ActiveOrdersResponse>('GET', `${this.MAIN_RESOURCE}/general/active-orders`, null);
    }

    async fetchFavorites() {
        return await this.call<FavoritesResponse>('GET', `${this.ORDERS_RESOURCE}/favourites`, null);
    }

    async fetchTotalOrders() {
        return await this.call<TotalOrdersResponse>('GET', `${this.ORDERS_RESOURCE}/total-orders`, null);
    }

    async fetchReturns() {
        return await this.call<TotalReturnsResponse>('GET', `${this.ORDERS_RESOURCE}/returns`, null);
    }

    async fetchCustomerAccountInformation() {
        return await this.call<UserDetailsResponse>('GET', `${this.ORDERS_RESOURCE}/account-information`, null);
    }

    async fetchRecentlyBought() {
        return await this.call<RecentlyBoughtResponse>('GET', `${this.ORDERS_RESOURCE}/recently-bought`, null);
    }

    async fetchViewHistory() {
        return await this.call<ViewHistoryResponse>('GET', `${this.MAIN_RESOURCE}/general/product-history`, null);
    }

    async fetchMonthHotSale() {
        return await this.call<MonthHotSaleResponse>('GET', `${this.MAIN_RESOURCE}/general/month-hot-sale`, null);
    }

    async getMetadata() {
        return await this.call<unknown>('GET', `${this.MAIN_RESOURCE}/metadata`, null);
    }
}

export default CustomerDashboard;
