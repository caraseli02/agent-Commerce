import { useAuthStore } from '~/store/authStore';
import HttpFactory from '~/composables/HttpFactory';
import { PriceSettingsTypeEnum, type PriceSettingsResponseInterface } from '~/model/prices/price-settings.interface';
import { AccountRole } from '~/types';

class SmartPricingService extends HttpFactory {
    private MAIN = '/prices';

    private authStore = useAuthStore();

    async fetchPriceSettings() {
        const token = this.authStore.getToken();
        const user = this.authStore.userDetails;

        if (user && user.role === AccountRole.Client) {
            return null;
        }

        return await this.call<PriceSettingsResponseInterface>('GET', `${this.MAIN}/price-settings`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async setNewPriceRange(range: { min: number | null; max: number | null; label: string | null }) {
        const token = this.authStore.getToken();
        const data = {
            type: PriceSettingsTypeEnum.Range,
            range: {
                min: range.min,
                max: range.max,
            },
            label: range.label,
        };
        return await this.call<{ status: string; data: { id: string } }>('POST', `${this.MAIN}/price-setting`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async setNewQuantityRange(quantity: { values: number[]; label: string | null }) {
        const token = this.authStore.getToken();
        const data = {
            type: PriceSettingsTypeEnum.Quantity,
            values: quantity.values,
            label: quantity.label,
        };
        return await this.call<{ status: string; data: { id: string } }>('POST', `${this.MAIN}/price-setting`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async setNewMarginRange(margin: { values: number[]; label: string | null }) {
        const token = this.authStore.getToken();
        const data = {
            type: PriceSettingsTypeEnum.Margins,
            values: margin.values,
            label: margin.label,
        };
        return await this.call<{ status: string; data: { id: string } }>('POST', `${this.MAIN}/price-setting`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async deleteSmartPricingEntity(type: PriceSettingsTypeEnum, id: string) {
        const token = this.authStore.getToken();
        const data = {
            type: type,
        };
        return await this.call<{ status: string; data: string }>('DELETE', `${this.MAIN}/price-setting/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    async editPriceRange(data: object, id: string) {
        const token = this.authStore.getToken();
        return await this.call<{
            status: string;
            data: { id: string };
        }>('PATCH', `${this.MAIN}/price-setting/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }
}

export default SmartPricingService;
