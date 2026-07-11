import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const adminOrderRoute = join(repoRoot, 'pages/dashboard/orders/[id].vue');

describe('order confirmation admin adapter', () => {
  it('reuses the shared order confirmation module and keeps admin-only controls', async () => {
    const source = await readFile(adminOrderRoute, 'utf8');

    expect(source).toContain('<OrderConfirmAdminBtns v-if="data?.data?.order" :order="data?.data?.order" class="px-2" />');
    expect(source).toContain(':payment-status="data.data?.order?.paymentDetails?.status"');
    expect(source).toContain('<OrderConfirmHeader');
    expect(source).toContain('<OrderConfirmDetails');
    expect(source).toContain('<OrderConfirmAddress');
    expect(source).toContain('<OrderConfirmStackItems');
    expect(source).toContain('<OrderConfirmBackItems');
    expect(source).toContain('<OrderConfirmPaySummary');
    expect(source).toContain('<OrderConfirmCompanyDetails />');
    expect(source).toContain('<OrderConfirmBankDetails />');

    expect(source).not.toContain('<OrderConfirmThankYou');
    expect(source).not.toContain('Continue Shopping');
    expect(source).not.toContain('Dashboard</UiButton>');
  });
});
