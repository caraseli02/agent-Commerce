import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const dialogPath = resolve('components/cart/CartDeleteDialog.vue');
const headPath = resolve('components/order-summary/Table/Head.vue');
const itemPath = resolve('components/order-summary/Table/Item.vue');
const itemDropdownPath = resolve('components/order-summary/Table/ItemDropdown.vue');

describe('cart delete confirmation consistency', () => {
  it('keeps a single shared CartDeleteDialog with Delete/Cancel labels', () => {
    const dialog = readFileSync(dialogPath, 'utf8');

    expect(dialog).toContain("confirmLabel: 'Delete'");
    expect(dialog).toContain("cancelLabel: 'Cancel'");
    expect(dialog).toContain('Delete Item');
    expect(dialog).toContain('Delete Items');
    expect(dialog).toContain('Delete ${count.value} selected items?');
    expect(dialog).toContain('Delete selected item?');
    expect(dialog).toContain('isDeleting');
    expect(dialog).not.toContain('Confirm');
    expect(dialog).not.toContain('>Deleted<');
  });

  it('routes bulk delete through the shared dialog and disables when nothing is selected', () => {
    const head = readFileSync(headPath, 'utf8');

    expect(head).toContain('CartDeleteDialog');
    expect(head).toContain(':product-ids="selectedProductIds"');
    expect(head).toContain(':disabled="!canDeleteSelected"');
    expect(head).toContain('selectedItems.value > 0');
    expect(head).not.toContain('Delete all selected items?');
    expect(head).not.toContain('Confirm');
    expect(head).not.toContain('UiDialogTrigger');
  });

  it('uses the shared dialog for single-item deletes in the order summary table', () => {
    const item = readFileSync(itemPath, 'utf8');
    const dropdown = readFileSync(itemDropdownPath, 'utf8');

    expect(item).toContain('CartDeleteDialog');
    expect(item).toContain(':product-ids="[item.id]"');
    expect(dropdown).toContain('CartDeleteDialog');
    expect(dropdown).toContain(':product-ids="[item.id]"');
  });
});
