import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateAddress = vi.fn();
const registerClassic = vi.fn();
const registerFirebase = vi.fn();
const updateAccountDetails = vi.fn();
const userCards = vi.fn();
const updateCardAsDefault = vi.fn();
const deleteCard = vi.fn();
const updateDetails = vi.fn();

vi.mock('~/composables/api/orders', () => ({
  validateAddress: (...args: unknown[]) => validateAddress(...args),
}));

vi.mock('~/composables/api/auth', () => ({
  registerClassic: (...args: unknown[]) => registerClassic(...args),
  registerFirebase: (...args: unknown[]) => registerFirebase(...args),
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

  it('useSignup validates addresses and routes classic vs firebase register policy', async () => {
    const { useSignup } = await import('~/composables/useSignup');
    const { isSignupAddressValid, registerSignupAccount } = useSignup();

    validateAddress.mockResolvedValue({ data: { valid: true } });
    expect(
      await isSignupAddressValid({
        name1: 'Line 1',
        country: 'RO',
        region: 'B',
        city: 'Bucharest',
        postcode: '010000',
        default: false,
      })
    ).toBe(true);

    registerClassic.mockResolvedValue({ status: 'success' });
    await registerSignupAccount({
      mode: 'classic',
      payload: {
        account: {
          accountType: 0,
          role: 2,
          profileDetails: { email: 'a@b.com', password: 'secret' },
          contactDetails: { firstName: 'A', lastName: 'B', phone: '1', email: 'a@b.com' },
          personalDetails: {
            firstName: 'A',
            lastName: 'B',
            address: {
              _id: '',
              name1: 'Line 1',
              country: 'RO',
              region: 'B',
              city: 'Bucharest',
              postcode: '010000',
            },
            shippingAddress: [],
            billingAddress: [],
          },
        },
      },
    });
    expect(registerClassic).toHaveBeenCalledOnce();
    expect(registerFirebase).not.toHaveBeenCalled();

    registerFirebase.mockResolvedValue({ status: 'success' });
    await registerSignupAccount({
      mode: 'firebase',
      firebaseId: 'fb-1',
      payload: {
        account: {
          accountType: 0,
          role: 2,
          profileDetails: { email: 'a@b.com', password: 'secret' },
          contactDetails: { firstName: 'A', lastName: 'B', phone: '1', email: 'a@b.com' },
          personalDetails: {
            firstName: 'A',
            lastName: 'B',
            address: {
              _id: '',
              name1: 'Line 1',
              country: 'RO',
              region: 'B',
              city: 'Bucharest',
              postcode: '010000',
            },
            shippingAddress: [],
            billingAddress: [],
          },
        },
      },
    });

    const firebasePayload = registerFirebase.mock.calls[0][0] as {
      account: { firebaseId?: string; profileDetails: { password?: string } };
      isAlreadyRegisteredWithFirebase?: boolean;
    };
    expect(firebasePayload.account.firebaseId).toBe('fb-1');
    expect(firebasePayload.account.profileDetails.password).toBeUndefined();
    expect(firebasePayload.isAlreadyRegisteredWithFirebase).toBe(true);
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
      })
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
      })
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
