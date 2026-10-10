import { getDemoUserProfile } from '~~/server/utils/mockDashboardDemo';
import { getRuntimeAddresses } from '~~/server/utils/mockRuntimeAddresses';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');
  const profile = getDemoUserProfile(id);
  const addresses = getRuntimeAddresses(id);

  return {
    status: 'success',
    data: {
      ...profile,
      accountType: 2,
      contactDetails: {
        ...profile.contactDetails,
      },
      companyDetails: {
        name: 'Demo Components LLC',
        registrationNumber: 'J40/1234/2024',
        taxId: 'RO12345678',
        vat: 'RO12345678',
        bank_name: 'Demo Bank',
        bank_iban: 'RO49AAAA1B31007593840000',
        address: profile.personalDetails?.address,
        shippingAddress: addresses.shippingAddress,
        billingAddress: addresses.billingAddress,
      },
      shippingAddress: addresses.shippingAddress,
      billingAddress: addresses.billingAddress,
    },
  };
});
