import HttpFactory from '~/composables/HttpFactory';
import type { AccountAdminSettings } from '~/types/auth/account-settings';
import type { ShippingAddressInterface, UserInterface } from '~/types/auth/user-interface';
import type { PaginatedTransactionsInterface } from '~/model/dashboard/response/CustomerInterfaceResponse';

interface SettingTogglePayload {
    key: string;
    [option: string]: string | boolean;
}

class ControlPanelService extends HttpFactory {
    private MAIN = '/dashboard/control-panel';
    private SETTINGS_RESOURCE = `${this.MAIN}/settings`;
    private TRANSACTION_RESOURCE = '/transaction';
    private ACTIVITY_LOGS_RESOURCE = '/audit';

    async fetchCustomerSettings(id: string) {
        return await this.call<{
            status: string;
            data: AccountAdminSettings;
        }>('GET', `${this.SETTINGS_RESOURCE}/${id}`, null);
    }

    async markSettingsAsRead(setting: SettingTogglePayload, type: string, id: string) {
        const data = {
            setting: {
                name: setting.key,
                value: setting[type],
                option: type,
            },
        };
        return await this.call<{ status: string; data: string }>('POST', `${this.SETTINGS_RESOURCE}/${id}`, data);
    }

    async fetchCustomerDiscount(id: string) {
        return await this.call<AccountAdminSettings>('GET', `${this.SETTINGS_RESOURCE}/discount/${id}`, null);
    }

    async updateCustomerDiscount(discount: number, id: string) {
        const data = {
            value: discount,
        };
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/discount/${id}`, data);
    }

    async fetchCustomerCredit(id: string) {
        return await this.call<AccountAdminSettings>('GET', `${this.SETTINGS_RESOURCE}/customer-credit/${id}`, null);
    }

    async updateCustomerCredit(term: number, limit: string, id: string) {
        const data = {
            term: term,
            limit: limit,
        };
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/customer-credit/${id}`, data);
    }

    async toggleCloseCustomerCredit(id: string) {
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/customer-credit/close/${id}`, null);
    }

    async toggleFreezeCustomerCredit(id: string) {
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/customer-credit/freeze/${id}`, null);
    }

    async fetchShipping(id: string, type: number) {
        return await this.call<{
            status: string;
            data: unknown;
        }>('GET', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, null);
    }

    async fetchBilling(id: string, type: number) {
        return await this.call<{
            status: string;
            data: unknown;
        }>('GET', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, null);
    }

    async updateShipping(address: ShippingAddressInterface, userId: string) {
        return await this.call<{ status: string; data: string }>('PATCH', `user/shipping-address/${userId}`, { address: address });
    }

    async updateBilling(address: ShippingAddressInterface, userId: string) {
        return await this.call<{ status: string; data: string }>('PATCH', `user/billing-address/${userId}`, { address: address });
    }

    async addShipping(address: ShippingAddressInterface, userId: string) {
        return await this.call<{ status: string; data: string }>('POST', `user/shipping-address/${userId}`, { address: address });
    }

    async addBilling(address: ShippingAddressInterface, userId: string) {
        return await this.call<{ status: string; data: string }>('POST', `user/billing-address/${userId}`, { address: address });
    }

    async deleteShipping(id: string, userId: string) {
        return await this.call<{
            status: string;
            data: string;
        }>('DELETE', `user/shipping-address/${id}/${userId}`, null);
    }

    async deleteBilling(id: string, userId: string) {
        return await this.call<{
            status: string;
            data: string;
        }>('DELETE', `user/billing-address/${id}/${userId}`, null);
    }

    async fetchAccountDetails(id: string, type: number) {
        return await this.call<AccountAdminSettings>('GET', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, null);
    }

    async updateAccountDetails(id: string, account: UserInterface, type: number) {
        return await this.call<AccountAdminSettings>('POST', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, account);
    }

    async fetchTransactions(page: number, perPage: number, filters = {}, sort = {}) {
        return await this.call<PaginatedTransactionsInterface>('GET', this.TRANSACTION_RESOURCE, null, {
            params: {
                page: page,
                perPage: perPage,
                ...filters,
                ...sort,
            },
        });
    }

    async fetchActivityLogs(page: number, perPage: number, filters = {}, sort = {}) {
        return await this.call<unknown>('GET', this.ACTIVITY_LOGS_RESOURCE, null, {
            params: {
                page: page,
                perPage: perPage,
                ...filters,
                ...sort,
            },
        });
    }
}

export default ControlPanelService;
