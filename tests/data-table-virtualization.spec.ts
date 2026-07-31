import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dashboard data table virtualization', () => {
  it('wires TanStack Virtual into the shared DataTable body', () => {
    const source = readFileSync(resolve('components/dataTable/index.vue'), 'utf8');

    expect(source).toContain('useVirtualTableRows');
    expect(source).toContain('virtualized-table-scroll');
    expect(source).toContain('virtualized-table-body');
  });

  it('documents the virtual row composable contract', () => {
    const source = readFileSync(resolve('composables/useVirtualTableRows.ts'), 'utf8');

    expect(source).toContain('@tanstack/vue-virtual');
    expect(source).toContain('paddingTop');
    expect(source).toContain('paddingBottom');
  });
});
