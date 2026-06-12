export enum PriceSettingsTypeEnum {
    Range = 0,
    Quantity = 1,
    Margins = 2,
}

export interface RangeInterface {
    min: number;
    max: number;
}

export interface PriceSettingsInterface {
    _id: string;
    type: PriceSettingsTypeEnum;
    range?: RangeInterface;
    values?: number[];
    linked: boolean;
    label: string;
}

export interface PriceSettingsResponseInterface {
    data: PriceSettingsInterface[];
    status: string;
}

export interface PriceSmartLinkingInterface {
    _id?: string;
    priceRangeId: string;
    quantityId: string;
    marginId: string;
}

export interface SmartPricingOption {
    _id: string;
    label: string;
    value: string[];
    selected: boolean;
}
