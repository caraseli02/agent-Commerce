import { defineStore } from 'pinia';
import { useNuxtApp } from '#app';
import { type PriceSettingsInterface, type SmartPricingOption, PriceSettingsTypeEnum } from '~/model/prices/price-settings.interface';
import { smartPricingMargin, smartPricingQuantity, smartPricingRange } from '~/helpers/smart-pricing.helper';

export type SmartPricingListItem = SmartPricingOption;

export const usePricingStore = defineStore({
    id: 'pricing-store',
    state: () => {
        return {
            pricing: null as PriceSettingsInterface[] | null,
            range: [] as SmartPricingOption[],
            quantity: [] as SmartPricingOption[],
            margin: [] as SmartPricingOption[],
            showEntryModal: false,
            showMarginModal: false,
            showQuantityModal: false,
            editEntryPriceModal: null as PriceSettingsInterface | null,
            editQuantityModal: null as SmartPricingOption | null,
            editMarginModal: null as SmartPricingOption | null,
            type: 'add' as 'add' | 'edit',
        };
    },
    actions: {
        setPricing(pricing: PriceSettingsInterface[]) {
            this.pricing = pricing;
        },
        async updateAndReturnPricing() {
            const { $api } = useNuxtApp();
            const pricingResponse = await $api.smartPricing.fetchPriceSettings();

            if (!pricingResponse || pricingResponse.status !== 'success') {
                return null;
            }

            this.pricing = pricingResponse.data;
            this.range = smartPricingRange(this.pricing.filter((price) => price.type === PriceSettingsTypeEnum.Range));
            this.quantity = smartPricingQuantity(this.pricing.filter((quantity) => quantity.type === PriceSettingsTypeEnum.Quantity));
            this.margin = smartPricingMargin(this.pricing.filter((margin) => margin.type === PriceSettingsTypeEnum.Margins));
            return this.pricing;
        },
        emptyPricing() {
            this.pricing = null;
        },
        addPriceRange(range: { min: number | null; max: number | null }, label: string | null, _id: string) {
            this.range.push({ value: [`$${range.min} - $${range.max}`], label: label ?? '', selected: false, _id });
        },
        addQuantityRange(quantity: { values: string[]; label: string }, _id: string) {
            this.quantity.push({ value: quantity.values, label: quantity.label, selected: false, _id });
        },
        addMarginRange(margin: { values: string[]; label: string | null }, _id: string) {
            this.margin.push({ value: margin.values, label: margin.label ?? '', selected: false, _id });
        },
        removePriceRange(_id: string) {
            this.range = this.range.filter((range) => range._id !== _id);
        },
        removeQuantityRange(_id: string) {
            this.quantity = this.quantity.filter((quantity) => quantity._id !== _id);
        },
        removeMarginRange(_id: string) {
            this.margin = this.margin.filter((margin) => margin._id !== _id);
        },
        editPriceRange(range: { min: number | null; max: number | null }, label: string | null, _id: string) {
            this.range = this.range.map((r) => {
                if (r._id === _id) {
                    return {
                        ...r,
                        value: [`$${range.min} - $${range.max}`],
                        label: label ?? r.label,
                    };
                }
                return r;
            });
        },
    },
    getters: {
        getPricing: async (state) => {
            const { $api } = useNuxtApp();

            if (!state.pricing) {
                const pricingResponse = await $api.smartPricing.fetchPriceSettings();

                if (!pricingResponse) {
                    return null;
                }

                return pricingResponse.data;
            }

            return state.pricing;
        },
    },
    persist: {
        storage: piniaPluginPersistedstate.localStorage(),
    },
});
