import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFile(resolve(path), 'utf-8');

describe('reviewer-facing date fields (#766)', () => {
  it('formats the estimated pick-up date in the order confirmation header', async () => {
    const source = await read('app/components/order-confirm/Header.vue');

    expect(source).toContain("from '~~/helpers/reviewer-dates'");
    expect(source).toContain('{{ formatReviewerDate(pickupDate) }}');
    expect(source).not.toMatch(/\{\{\s*pickupDate\s*\}\}/);
  });

  it.each(['app/components/dashboard/client/Info.vue', 'app/components/dashboard/customers/CustomerInformation.vue'])(
    'formats the last activity date in %s',
    async (path) => {
      const source = await read(path);

      expect(source).toContain('formatReviewerDateTime(customerInformation.lastActivityDate)');
      expect(source).not.toContain("customerInformation.lastActivityDate || '-'");
    },
  );
});
