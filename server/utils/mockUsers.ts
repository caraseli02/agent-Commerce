import { AccountRole, AccountType } from '~~/types/signup/form';
import type { UserPermissionsEnum } from '~~/types/auth/permissions';
import type { UserInterface } from '~~/types/auth/user-interface';
import {
  MOCK_ADMIN_PERMISSIONS,
  MOCK_ADMIN_USER_ID,
  MOCK_CUSTOMER_PERMISSIONS,
  MOCK_CUSTOMER_USER_ID,
  parseMockToken,
} from '~/utils/mockAuth';

type MockUser = UserInterface & {
  permissions: UserPermissionsEnum[];
  roles: AccountRole[];
};

interface MockUserCredentials {
  email: string;
  password: string;
  clientCode: string;
}

interface MockUserEntry {
  credentials: MockUserCredentials;
  user: MockUser;
}

const commonAddress = {
  name1: 'Demo Street 10',
  name2: 'Floor 2',
  country: 'US',
  region: 'California',
  city: 'San Francisco',
  postcode: '94105',
};

const customerUser: MockUser = {
  _id: MOCK_CUSTOMER_USER_ID,
  firebaseId: MOCK_CUSTOMER_USER_ID,
  role: AccountRole.Client,
  accountType: AccountType.Personal,
  verified: true,
  status: 1,
  permissions: MOCK_CUSTOMER_PERMISSIONS,
  roles: [AccountRole.Client],
  contactDetails: {
    firstName: 'Demo',
    lastName: 'Customer',
    email: 'customer@demo.com',
    phone: '+14085550101',
  },
  profileDetails: {
    email: 'customer@demo.com',
  },
  personalDetails: {
    firstName: 'Demo',
    lastName: 'Customer',
    address: {
      ...commonAddress,
      _id: 'customer-address-1',
    },
    shippingAddress: [
      {
        ...commonAddress,
        alias: 'Shipping',
        default: true,
        _id: 'customer-shipping-1',
      },
    ],
    billingAddress: [
      {
        ...commonAddress,
        alias: 'Billing',
        default: true,
        _id: 'customer-billing-1',
      },
    ],
  },
  adminSettings: {
    discount: {
      value: 5,
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2028-01-01T00:00:00.000Z',
    },
    customerCredit: {
      limit: 5000,
      spent: 1200,
      available: 3800,
      dueDate: '2026-03-31T00:00:00.000Z',
      tillDue: '30',
      term: 30,
      freeze: false,
      active: true,
    },
    marketingPreferences: {
      cookiesPolicy: { email: true, app: false },
      newsletter: { email: true, app: false },
      emailMarketing: { email: true, app: false },
    },
    alertsAndNotifications: {
      newProducts: { email: true, app: true },
      hotDeals: { email: true, app: true },
      outOfStock: { email: true, app: false },
      priceChange: { email: true, app: true },
      shippingUpdates: { email: true, app: true },
    },
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  clientCode: 'P-123456',
};

const adminUser: MockUser = {
  _id: MOCK_ADMIN_USER_ID,
  firebaseId: MOCK_ADMIN_USER_ID,
  role: AccountRole.Admin,
  accountType: AccountType.Business,
  verified: true,
  status: 1,
  permissions: MOCK_ADMIN_PERMISSIONS,
  roles: [AccountRole.Admin],
  contactDetails: {
    firstName: 'Demo',
    lastName: 'Admin',
    email: 'admin@demo.com',
    phone: '+14085550100',
  },
  profileDetails: {
    email: 'admin@demo.com',
  },
  companyDetails: {
    name: 'Demo Company LLC',
    registrationNumber: 'REG-2026-001',
    vat: 'US123456789',
    taxId: 'TAX-998877',
    address: {
      ...commonAddress,
      _id: 'admin-address-1',
    },
    shippingAddress: [
      {
        ...commonAddress,
        alias: 'Warehouse',
        default: true,
        _id: 'admin-shipping-1',
      },
    ],
    billingAddress: [
      {
        ...commonAddress,
        alias: 'Finance',
        default: true,
        _id: 'admin-billing-1',
      },
    ],
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  clientCode: 'A-123456',
};

const mockUsers: MockUserEntry[] = [
  {
    credentials: {
      email: 'customer@demo.com',
      password: 'customer123',
      clientCode: 'P-123456',
    },
    user: customerUser,
  },
  {
    credentials: {
      email: 'admin@demo.com',
      password: 'admin123',
      clientCode: 'A-123456',
    },
    user: adminUser,
  },
];

export const createMockToken = (userId: string) => `demo-token::${userId}::${Date.now()}`;

export const getMockUserById = (userId?: string | null) => {
  if (!userId) {
    return null;
  }

  const match = mockUsers.find((entry) => entry.user._id === userId);
  return match?.user || null;
};

export const createMockGuestCheckoutUser = (ownerId: string): MockUser => ({
  ...customerUser,
  _id: ownerId,
  firebaseId: ownerId,
  contactDetails: { ...customerUser.contactDetails },
  adminSettings: {
    ...customerUser.adminSettings,
    discount: {
      ...customerUser.adminSettings!.discount!,
      value: 0,
    },
  },
});

export const getMockUserByCredentials = (credentials: { email?: string; clientCode?: string; password?: string }) => {
  return mockUsers.find((entry) => {
    const hasValidPassword = entry.credentials.password === credentials.password;
    const normalizedEmail = String(credentials.email || '').toLowerCase();
    const normalizedClientCode = String(credentials.clientCode || '').toUpperCase();

    return (
      hasValidPassword &&
      (entry.credentials.email.toLowerCase() === normalizedEmail || entry.credentials.clientCode.toUpperCase() === normalizedClientCode)
    );
  });
};

export const getMockUserFromAuthHeader = (authorizationHeader?: string) => {
  const userId = parseMockUserIdFromToken(authorizationHeader);
  return getMockUserById(userId);
};

export const parseMockUserIdFromToken = (authorizationHeader?: string | null) => {
  return parseMockToken(authorizationHeader)?.userId || null;
};
