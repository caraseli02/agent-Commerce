import { AccountRole } from '~/types/signup/form';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';

export default defineEventHandler((event) => {
  const headers = getHeaders(event);
  const user = getMockUserFromAuthHeader(headers.authorization);

  if (!user) {
    return {
      status: 'success',
      data: [],
    };
  }

  if (user.role !== AccountRole.Client) {
    return {
      status: 'success',
      data: [],
    };
  }

  return {
    status: 'success',
    data: [
      {
        id: 'card-demo-1',
        customer: user._id,
        type: 'card',
        default: true,
        billing_details: {
          name1: `${user.contactDetails.firstName} ${user.contactDetails.lastName}`,
          name2: '',
          country: user.personalDetails?.address.country || 'US',
          region: user.personalDetails?.address.region || 'California',
          city: user.personalDetails?.address.city || 'San Francisco',
          postcode: user.personalDetails?.address.postcode || '94105',
          default: true,
        },
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2030,
          type: 'credit',
          is_expired: false,
        },
      },
    ],
  };
});
