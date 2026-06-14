import type {
    CustomersByCountryInterface,
    NewCustomersInterface,
    PaginatedCustomersInterface,
    ReturningCustomersInterface,
    TotalCustomersInterface,
} from '~/model/dashboard/response/CustomerInterfaceResponse';
import HttpFactory from '~/composables/HttpFactory';

class UserDashboardService extends HttpFactory {
    private RESOURCE = '/user';
    private MAIN_RESOURCE = '/dashboard/users';

    async fetchCustomersList(page: number, perPage: number, filters = {}, sort = {}) {
        return await this.call<PaginatedCustomersInterface>('GET', this.RESOURCE, null, {
            params: {
                page: page,
                perPage: perPage,
                ...filters,
                ...sort,
            },
        });
    }

    async fetchTotalCustomersWidget(time = 7) {
        return await this.call<TotalCustomersInterface>('GET', `${this.MAIN_RESOURCE}/total-customers`, null, {
            params: {
                time: time,
            },
        });
    }

    async fetchReturningCustomersWidget(time = 7) {
        return await this.call<ReturningCustomersInterface>('GET', `${this.MAIN_RESOURCE}/returning-customers`, null, {
            params: {
                time: time,
            },
        });
    }

    async fetchNewCustomersWidget() {
        return await this.call<NewCustomersInterface>('GET', `${this.MAIN_RESOURCE}/new-customers`, null);
    }

    async fetchCustomersByCountryWidget() {
        return await this.call<CustomersByCountryInterface>('GET', `${this.MAIN_RESOURCE}/customers-top-country`, null);
    }

    async deactivateUser(userID: string) {
        return await this.call<CustomersByCountryInterface>('DELETE', `${this.RESOURCE}/deactivate/${userID}`, null);
    }

    async activateUser(userID: string) {
        return await this.call('POST', `${this.RESOURCE}/activate/${userID}`, null);
    }

    async approveUser(userID: string) {
        return await this.call('POST', `${this.RESOURCE}/approve/${userID}`, null);
    }

    async deleteUser(userID: string) {
        return await this.call('DELETE', `${this.RESOURCE}/${userID}`, null);
    }
}

export default UserDashboardService;
