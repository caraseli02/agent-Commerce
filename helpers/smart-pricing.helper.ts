import { PriceSettingsTypeEnum, type PriceSettingsInterface, type SmartPricingOption } from '~~/model/prices/price-settings.interface';

export const smartPricingRange = (pricing: PriceSettingsInterface[]): SmartPricingOption[] => {
  return pricing
    ? pricing
        .filter((smartPricing) => smartPricing.type === PriceSettingsTypeEnum.Range)
        .map((item, index) => ({
          selected: false,
          value: item.range ? [`$${item.range.min} - $${item.range.max}`] : [],
          label: item.label || `EP-${index}`,
          _id: item._id,
        }))
    : [];
};

export const smartPricingQuantity = (pricing: PriceSettingsInterface[]): SmartPricingOption[] => {
  return pricing
    .filter((smartPricing) => smartPricing.type === PriceSettingsTypeEnum.Quantity)
    .map((item, index) => ({
      selected: false,
      value: item.values
        ? item.values.reduce<string[]>((acc, curr, i) => {
            const previousRange = i === 0 ? undefined : acc[i - 1];
            const previousMaximum = previousRange?.split(' - ')[1];
            const prevMax = previousMaximum ? parseInt(previousMaximum, 10) + 1 : 0;
            const range = `${prevMax} - ${curr}`;
            acc.push(range);
            return acc;
          }, [])
        : [],
      label: item.label || `QTY-${index}`,
      _id: item._id,
    }));
};

export const smartPricingMargin = (pricing: PriceSettingsInterface[]): SmartPricingOption[] => {
  return pricing
    .filter((smartPricing) => smartPricing.type === PriceSettingsTypeEnum.Margins)
    .map((item, index) => ({
      selected: false,
      value: item.values ? item.values.map((value) => `${value}%`) : [],
      label: item.label || `NM-${index}`,
      _id: item._id,
    }));
};
