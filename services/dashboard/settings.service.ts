import { useAuthStore } from '~/store/authStore';
import HttpFactory from '~/composables/HttpFactory';
import type { AccountAdminSettings } from '~/types/auth/account-settings';
import type { BillingAddressInterface, ShippingAddressInterface } from '~/types/auth/user-interface';
import { AccountType } from '~/types';
import type { DetailsResponse } from '~/model/dashboard/customer-information/customer-information';

class SettingsClientService extends HttpFactory {
    private MAIN = '/';
    private USER_PATH = '/user';
    private DASHBOARD_PATH = '/dashboard';
    private CONTROL_PANEL_PATH = '/control-panel';

    private authStore = useAuthStore();

    async updateShipping(address: ShippingAddressInterface[]) {
        const token = this.authStore.getToken();

        return await this.call<AccountAdminSettings>(
            'PATCH',
            `${this.USER_PATH}/shipping-address`,
            { address: address },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
    }

    async updateBilling(address: BillingAddressInterface[]) {
        const token = this.authStore.getToken();

        return await this.call<AccountAdminSettings>(
            'PATCH',
            `${this.USER_PATH}/billing-address`,
            { address: address },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
    }

    async updateDetails(payload: object) {
        const token = this.authStore.getToken();
        const userId = this.authStore.getUserDetails.firebaseId;
        const accountType = this.authStore.getUserDetails.accountType;

        return await this.call<DetailsResponse>(
            'POST',
            `${this.DASHBOARD_PATH}${this.CONTROL_PANEL_PATH}/${userId}/${
                accountType === AccountType.Personal ? 'personal' : 'organization'
            }`,
            payload,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
    }

    async updateCardAsDefault(cardId: string) {
        const token = this.authStore.getToken();

        return await this.call<unknown>('POST', `${this.USER_PATH}/card/default/${cardId}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async deleteCard(cardId: string) {
        const token = this.authStore.getToken();

        return await this.call<{ status: string; data: unknown }>('DELETE', `${this.USER_PATH}/card/${cardId}`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }
}

export default SettingsClientService;
