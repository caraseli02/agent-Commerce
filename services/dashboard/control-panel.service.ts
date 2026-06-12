import { useAuthStore } from '~/store/authStore';
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

    private authStore = useAuthStore();

    async fetchCustomerSettings(id: string) {
        const token = this.authStore.getToken();
        return await this.call<{
            status: string;
            data: AccountAdminSettings;
        }>('GET', `${this.SETTINGS_RESOURCE}/${id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async markSettingsAsRead(setting: SettingTogglePayload, type: string, id: string) {
        const token = this.authStore.getToken();

        const data = {
            setting: {
                name: setting.key,
                value: setting[type],
                option: type,
            },
        };
        return await this.call<{ status: string; data: string }>('POST', `${this.SETTINGS_RESOURCE}/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async fetchCustomerDiscount(id: string) {
        const token = this.authStore.getToken();
        return await this.call<AccountAdminSettings>('GET', `${this.SETTINGS_RESOURCE}/discount/${id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async updateCustomerDiscount(discount: number, id: string) {
        const token = this.authStore.getToken();
        const data = {
            value: discount,
        };
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/discount/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async fetchCustomerCredit(id: string) {
        const token = this.authStore.getToken();
        return await this.call<AccountAdminSettings>('GET', `${this.SETTINGS_RESOURCE}/customer-credit/${id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async updateCustomerCredit(term: number, limit: string, id: string) {
        const token = this.authStore.getToken();
        const data = {
            term: term,
            limit: limit,
        };
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/customer-credit/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async toggleCloseCustomerCredit(id: string) {
        const token = this.authStore.getToken();
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/customer-credit/close/${id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async toggleFreezeCustomerCredit(id: string) {
        const token = this.authStore.getToken();
        return await this.call<AccountAdminSettings>('PUT', `${this.SETTINGS_RESOURCE}/customer-credit/freeze/${id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async fetchShipping(id: string, type: number) {
        const token = this.authStore.getToken();
        return await this.call<{
            status: string;
            data: unknown;
        }>('GET', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async fetchBilling(id: string, type: number) {
        const token = this.authStore.getToken();
        return await this.call<{
            status: string;
            data: unknown;
        }>('GET', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async updateShipping(address: ShippingAddressInterface, userId: string) {
        const token = this.authStore.getToken();

        return await this.call<{ status: string; data: string }>(
            'PATCH',
            `user/shipping-address/${userId}`,
            { address: address },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
    }

    async updateBilling(address: ShippingAddressInterface, userId: string) {
        const token = this.authStore.getToken();

        return await this.call<{ status: string; data: string }>(
            'PATCH',
            `user/billing-address/${userId}`,
            { address: address },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
    }

    async addShipping(address: ShippingAddressInterface, userId: string) {
        const token = this.authStore.getToken();

        return await this.call<{ status: string; data: string }>(
            'POST',
            `user/shipping-address/${userId}`,
            { address: address },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
    }

    async addBilling(address: ShippingAddressInterface, userId: string) {
        const token = this.authStore.getToken();

        return await this.call<{ status: string; data: string }>(
            'POST',
            `user/billing-address/${userId}`,
            { address: address },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
    }

    async deleteShipping(id: string, userId: string) {
        const token = this.authStore.getToken();

        return await this.call<{
            status: string;
            data: string;
        }>('DELETE', `user/shipping-address/${id}/${userId}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async deleteBilling(id: string, userId: string) {
        const token = this.authStore.getToken();

        return await this.call<{
            status: string;
            data: string;
        }>('DELETE', `user/billing-address/${id}/${userId}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async fetchAccountDetails(id: string, type: number) {
        const token = this.authStore.getToken();
        return await this.call<AccountAdminSettings>('GET', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async updateAccountDetails(id: string, account: UserInterface, type: number) {
        const token = this.authStore.getToken();

        return await this.call<AccountAdminSettings>('POST', `${this.MAIN}/${id}/${type === 0 ? 'personal' : 'organization'}`, account, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async fetchTransactions(page: number, perPage: number, filters = {}, sort = {}) {
        const token = this.authStore.getToken();

        return await this.call<PaginatedTransactionsInterface>('GET', this.TRANSACTION_RESOURCE, null, {
            params: {
                page: page,
                perPage: perPage,
                ...filters,
                ...sort,
            },
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async fetchActivityLogs(page: number, perPage: number, filters = {}, sort = {}) {
        const token = this.authStore.getToken();

        return await this.call<unknown>('GET', this.ACTIVITY_LOGS_RESOURCE, null, {
            params: {
                page: page,
                perPage: perPage,
                ...filters,
                ...sort,
            },
            headers: { Authorization: `Bearer ${token}` },
        });
    }
}

export default ControlPanelService;
