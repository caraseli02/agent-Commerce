import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

const apiImportPattern = /from ['"]~{1,2}\/composables\/api\//;

const checkoutAccountSurfaces = [
  'pages/signup.vue',
  'pages/checkout/success/index.vue',
  'components/dashboard/control-panel/AccountView.vue',
  'components/dashboard/control-panel/OrganizationView.vue',
  'components/dashboard/control-panel/BillingView.vue',
  'components/dashboard/control-panel/ShippingView.vue',
  'components/dashboard/control-panel/AddAddress.vue',
  'components/dashboard/control-panel/EditAddress.vue',
  'components/dashboard/control-panel/settings-view/Settings.vue',
  'components/dashboard/control-panel/settings-view/CustomerDiscount.vue',
  'components/dashboard/control-panel/settings-view/CustomerCredit.vue',
  'components/dashboard/control-panel/settings-view/CustomerCreditEdit.vue',
  'components/dashboard/client/settings/Details.vue',
  'components/dashboard/client/settings/Billing.vue',
  'components/dashboard/client/settings/BillingDialog.vue',
  'components/dashboard/client/settings/Shipping.vue',
  'components/dashboard/client/settings/ShippingDialog.vue',
  'components/dashboard/client/settings/Security.vue',
  'components/dashboard/client/settings/Marketing.vue',
  'components/dashboard/client/settings/AlertsItem.vue',
  'components/dashboard/client/settings/Alerts.vue',
  'components/dashboard/client/settings/CardsList.vue',
  'pages/dashboard/customers/[slug]/control-panel.vue',
  'pages/dashboard/customers/[slug]/control-panel/[view].vue',
  'pages/dashboard/customers/[slug]/index.vue',
  'components/client-table/transaction/Index.vue',
  'components/client-table/logs/logs.vue',
];

describe('checkout and account application seam', () => {
  it('keeps signup, checkout success, and account-panel surfaces off direct API imports', () => {
    const offenders = checkoutAccountSurfaces.filter((path) => apiImportPattern.test(source(path)));

    expect(offenders).toEqual([]);
  });

  it('routes signup orchestration through useSignup', () => {
    const useSignupSource = source('composables/useSignup.ts');

    expect(useSignupSource).toContain("from '~/composables/api/auth'");
    expect(useSignupSource).toContain("from '~/composables/api/orders'");
    expect(useSignupSource).toContain('validateSignupAddress');
    expect(useSignupSource).toContain('registerWithClassic');
    expect(useSignupSource).toContain('registerWithFirebase');
  });

  it('routes control-panel orchestration through useControlPanel', () => {
    const useControlPanelSource = source('composables/useControlPanel.ts');

    expect(useControlPanelSource).toContain("from '~/composables/api/control-panel'");
    expect(useControlPanelSource).toContain('updateAccountDetails');
    expect(useControlPanelSource).toContain('fetchTransactions');
    expect(useControlPanelSource).toContain('fetchCustomerInformation');
  });

  it('routes client account mutations through useClientAccount', () => {
    const useClientAccountSource = source('composables/useClientAccount.ts');

    expect(useClientAccountSource).toContain("from '~/composables/api/client-settings'");
    expect(useClientAccountSource).toContain("from '~/composables/api/user'");
    expect(useClientAccountSource).toContain('updateDetails');
    expect(useClientAccountSource).toContain('deleteCard');
  });

  it('routes checkout success order fetch through useOrderConfirmation', () => {
    const useOrderConfirmationSource = source('composables/useOrderConfirmation.ts');

    expect(useOrderConfirmationSource).toContain("from '~/composables/api/orders'");
    expect(useOrderConfirmationSource).toContain('loadCheckoutSuccessOrder');
    expect(useOrderConfirmationSource).toContain('getOrderById');
  });
});
