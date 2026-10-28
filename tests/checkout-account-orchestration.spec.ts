import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateAddress = vi.fn();
const register = vi.fn();
const startSession = vi.fn();
const updateAccountDetails = vi.fn();
const userCards = vi.fn();
const updateCardAsDefault = vi.fn();
const deleteCard = vi.fn();
const updateDetails = vi.fn();

vi.mock('~/composables/api/orders', () => ({
  validateAddress: (...args: unknown[]) => validateAddress(...args),
}));

vi.mock('~/composables/api/auth', () => ({
  register: (...args: unknown[]) => register(...args),
}));

vi.mock('~/composables/useSessionSignIn', () => ({
  useSessionSignIn: () => ({ startSession: (...args: unknown[]) => startSession(...args) }),
}));

vi.mock('~/composables/api/control-panel', () => ({
  updateAccountDetails: (...args: unknown[]) => updateAccountDetails(...args),
  addBilling: vi.fn(),
  addShipping: vi.fn(),
  deleteBilling: vi.fn(),
  deleteShipping: vi.fn(),
  fetchActivityLogs: vi.fn(),
  fetchBilling: vi.fn(),
  fetchCustomerCredit: vi.fn(),
  fetchCustomerDiscount: vi.fn(),
  fetchCustomerSettings: vi.fn(),
  fetchShipping: vi.fn(),
  fetchTransactions: vi.fn(),
  markSettingsAsRead: vi.fn(),
  toggleCloseCustomerCredit: vi.fn(),
  toggleFreezeCustomerCredit: vi.fn(),
  updateBilling: vi.fn(),
  updateCustomerCredit: vi.fn(),
  updateCustomerDiscount: vi.fn(),
  updateShipping: vi.fn(),
}));

vi.mock('~/composables/api/customer-profile', () => ({
  fetchCustomerInformation: vi.fn(),
}));

vi.mock('~/composables/api/user', () => ({
  resetPasswordLink: vi.fn(),
  userCards: (...args: unknown[]) => userCards(...args),
  addBillingAsCustomer: vi.fn(),
  addShippingAsCustomer: vi.fn(),
  deleteBillingAsCustomer: vi.fn(),
  deleteShippingAsCustomer: vi.fn(),
  updateBillingAsCustomer: vi.fn(),
  updateShippingAsCustomer: vi.fn(),
}));

vi.mock('~/composables/api/client-settings', () => ({
  updateCardAsDefault: (...args: unknown[]) => updateCardAsDefault(...args),
  deleteCard: (...args: unknown[]) => deleteCard(...args),
  updateDetails: (...args: unknown[]) => updateDetails(...args),
}));

vi.mock('~/composables/api/settings', () => ({
  fetchSettings: vi.fn(),
}));

describe('checkout/account domain orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useSignup registers the customer and starts their session', async () => {
    const { useSignup } = await import('~/composables/useSignup');
    const { registerCustomer } = useSignup();
    const user = { _id: 'cus_1', contactDetails: { email: 'a@b.com' } };

    register.mockResolvedValue({ status: 'success', token: 'signed-token', user });
    startSession.mockResolvedValue(user);
    await expect(registerCustomer({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'secret-pass' })).resolves.toBe(user);
    expect(register).toHaveBeenCalledWith({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'secret-pass' });
    expect(startSession).toHaveBeenCalledWith('signed-token', user);

    startSession.mockResolvedValue(null);
    await expect(registerCustomer({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'secret-pass' })).rejects.toThrow(
      'Account created',
    );
  });

  it('useControlPanel validates then saves organization details', async () => {
    const { useControlPanel } = await import('~/composables/useControlPanel');
    const { saveOrganizationDetails } = useControlPanel();

    validateAddress.mockResolvedValue({ data: { valid: false } });
    expect(
      await saveOrganizationDetails({
        customerId: 'cust-1',
        accountType: 1,
        address: {
          _id: '',
          name1: 'Line 1',
          country: 'RO',
          region: 'B',
          city: 'Bucharest',
          postcode: '010000',
        },
        companyDetails: { name: 'Acme' },
        contactDetails: { firstName: 'A', lastName: 'B', phone: '1', email: 'a@b.com' },
      }),
    ).toBe(false);
    expect(updateAccountDetails).not.toHaveBeenCalled();

    validateAddress.mockResolvedValue({ data: { valid: true } });
    updateAccountDetails.mockResolvedValue({ status: 'success' });
    expect(
      await saveOrganizationDetails({
        customerId: 'cust-1',
        accountType: 1,
        address: {
          _id: '',
          name1: 'Line 1',
          country: 'RO',
          region: 'B',
          city: 'Bucharest',
          postcode: '010000',
        },
        companyDetails: { name: 'Acme' },
        contactDetails: { firstName: 'A', lastName: 'B', phone: '1', email: 'a@b.com' },
        shippingAddress: [],
      }),
    ).toBe(true);
    expect(updateAccountDetails).toHaveBeenCalledOnce();
  });

  it('useClientAccount normalizes card and details mutation outcomes', async () => {
    const { useClientAccount } = await import('~/composables/useClientAccount');
    const { loadUserCards, setDefaultCard, removeCard, saveAccountDetails } = useClientAccount();

    userCards.mockResolvedValue({ status: 'success', data: [{ id: 'card-1', default: true }] });
    expect(await loadUserCards()).toEqual([{ id: 'card-1', default: true }]);

    userCards.mockResolvedValue({ status: 'error', data: [] });
    expect(await loadUserCards()).toEqual([]);

    updateCardAsDefault.mockResolvedValue({ status: 'success' });
    expect(await setDefaultCard('card-1')).toBe(true);

    deleteCard.mockResolvedValue({ status: 'error' });
    expect(await removeCard('card-1')).toBe(false);

    updateDetails.mockResolvedValue({ status: 'success' });
    expect(await saveAccountDetails({ contactDetails: {} })).toBe(true);
  });
});
