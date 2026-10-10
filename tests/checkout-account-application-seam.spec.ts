import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

const apiImportPattern = /from ['"]~{1,2}\/composables\/api\//;

const checkoutAccountSurfaces = [
  'app/pages/signup.vue',
  'app/pages/checkout/success/index.vue',
  'app/components/dashboard/control-panel/AccountView.vue',
  'app/components/dashboard/control-panel/OrganizationView.vue',
  'app/components/dashboard/control-panel/BillingView.vue',
  'app/components/dashboard/control-panel/ShippingView.vue',
  'app/components/dashboard/control-panel/AddAddress.vue',
  'app/components/dashboard/control-panel/EditAddress.vue',
  'app/components/dashboard/control-panel/settings-view/Settings.vue',
  'app/components/dashboard/control-panel/settings-view/CustomerDiscount.vue',
  'app/components/dashboard/control-panel/settings-view/CustomerCredit.vue',
  'app/components/dashboard/control-panel/settings-view/CustomerCreditEdit.vue',
  'app/components/dashboard/client/settings/Details.vue',
  'app/components/dashboard/client/settings/Billing.vue',
  'app/components/dashboard/client/settings/BillingDialog.vue',
  'app/components/dashboard/client/settings/Shipping.vue',
  'app/components/dashboard/client/settings/ShippingDialog.vue',
  'app/components/dashboard/client/settings/Security.vue',
  'app/components/dashboard/client/settings/Marketing.vue',
  'app/components/dashboard/client/settings/AlertsItem.vue',
  'app/components/dashboard/client/settings/Alerts.vue',
  'app/components/dashboard/client/settings/CardsList.vue',
  'app/pages/dashboard/customers/[slug]/control-panel.vue',
  'app/pages/dashboard/customers/[slug]/control-panel/[view].vue',
  'app/pages/dashboard/customers/[slug]/index.vue',
  'app/components/client-table/transaction/Index.vue',
  'app/components/client-table/logs/logs.vue',
];

describe('checkout and account application seam', () => {
  it('keeps signup, checkout success, and account-panel surfaces off direct API imports', () => {
    const offenders = checkoutAccountSurfaces.filter((path) => apiImportPattern.test(source(path)));

    expect(offenders).toEqual([]);
  });

  it('routes signup orchestration through useSignup', () => {
    const useSignupSource = source('app/composables/useSignup.ts');

    expect(useSignupSource).toContain("from '~/composables/api/auth'");
    expect(useSignupSource).toContain("from '~/composables/api/orders'");
    expect(useSignupSource).toContain('isSignupAddressValid');
    expect(useSignupSource).toContain('registerSignupAccount');
  });

  it('routes control-panel orchestration through useControlPanel', () => {
    const useControlPanelSource = source('app/composables/useControlPanel.ts');

    expect(useControlPanelSource).toContain("from '~/composables/api/control-panel'");
    expect(useControlPanelSource).toContain('saveOrganizationDetails');
    expect(useControlPanelSource).toContain('loadBillingAddresses');
    expect(useControlPanelSource).toContain('loadCustomerDiscount');
  });

  it('routes client account mutations through useClientAccount', () => {
    const useClientAccountSource = source('app/composables/useClientAccount.ts');

    expect(useClientAccountSource).toContain("from '~/composables/api/client-settings'");
    expect(useClientAccountSource).toContain("from '~/composables/api/user'");
    expect(useClientAccountSource).toContain('loadUserCards');
    expect(useClientAccountSource).toContain('saveAccountDetails');
    expect(useClientAccountSource).toContain('setDefaultCard');
    expect(useClientAccountSource).toContain('removeCard');
  });

  it('routes checkout success order fetch through useOrderConfirmation', () => {
    const useOrderConfirmationSource = source('app/composables/useOrderConfirmation.ts');

    expect(useOrderConfirmationSource).toContain("from '~/composables/api/orders'");
    expect(useOrderConfirmationSource).toContain('loadCheckoutSuccessOrder');
    expect(useOrderConfirmationSource).toContain('getOrderById');
  });
});
