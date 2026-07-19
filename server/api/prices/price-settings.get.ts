import { getMockPricing, requireMockPricingPermission } from '~/server/utils/mockPricing';
import { UserPermissionsEnum } from '~/types/auth/permissions';

export default defineEventHandler((event) => {
  requireMockPricingPermission(event, UserPermissionsEnum.PriceSettingsRead);
  return {
    status: 'success',
    data: getMockPricing(event),
  };
});
