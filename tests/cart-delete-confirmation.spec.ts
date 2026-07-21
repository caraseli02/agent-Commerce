import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

import { resolveCartDeleteDescription, resolveCartDeleteProductIds, resolveCartDeleteTitle } from '~/utils/cartDeleteDialog';

const dialogPath = resolve('components/cart/CartDeleteDialog.vue');
const headPath = resolve('components/order-summary/Table/Head.vue');
const itemPath = resolve('components/order-summary/Table/Item.vue');
const itemDropdownPath = resolve('components/order-summary/Table/ItemDropdown.vue');

function parseTemplate(filePath: string): RootNode {
  const source = readFileSync(filePath, 'utf8');
  const { descriptor } = parseSfc(source);

  expect(descriptor.template).toBeTruthy();

  return baseParse(descriptor.template!.content);
}

function collectElements(root: RootNode, tag: string): ElementNode[] {
  const found: ElementNode[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;

    if ('type' in node && node.type === NodeTypes.ELEMENT) {
      const element = node as ElementNode;

      if (element.tag === tag) {
        found.push(element);
      }

      element.children.forEach(visit);
    }
  };

  root.children.forEach(visit);
  return found;
}

describe('cart delete confirmation copy behavior', () => {
  it('resolves single and bulk product ids', () => {
    expect(resolveCartDeleteProductIds({ productId: 'sku-1' })).toEqual(['sku-1']);
    expect(resolveCartDeleteProductIds({ productIds: ['a', 'b'], productId: 'ignored' })).toEqual(['a', 'b']);
    expect(resolveCartDeleteProductIds({ productIds: [], productId: 'sku-2' })).toEqual(['sku-2']);
    expect(resolveCartDeleteProductIds({})).toEqual([]);
  });

  it('uses Delete/Cancel-oriented single and bulk copy', () => {
    expect(resolveCartDeleteTitle({ productId: 'sku-1' })).toBe('Delete Item');
    expect(resolveCartDeleteDescription({ productId: 'sku-1' })).toBe('Delete selected item?');

    expect(resolveCartDeleteTitle({ productIds: ['a', 'b', 'c'] })).toBe('Delete Items');
    expect(resolveCartDeleteDescription({ productIds: ['a', 'b', 'c'] })).toBe('Delete 3 selected items?');

    expect(resolveCartDeleteTitle({ productIds: ['a', 'b'], title: 'Custom title' })).toBe('Custom title');
    expect(resolveCartDeleteDescription({ productIds: ['a', 'b'], description: 'Custom body' })).toBe('Custom body');
  });
});

describe('cart delete confirmation wiring', () => {
  it('exposes accessible dialog title and description primitives', () => {
    const dialogAst = parseTemplate(dialogPath);
    const dialogSource = readFileSync(dialogPath, 'utf8');

    expect(collectElements(dialogAst, 'UiDialogTitle')).toHaveLength(1);
    expect(collectElements(dialogAst, 'UiDialogDescription')).toHaveLength(1);
    expect(dialogSource).toContain("confirmLabel: 'Delete'");
    expect(dialogSource).toContain("cancelLabel: 'Cancel'");
    expect(dialogSource).not.toContain('>Deleted<');
    expect(dialogSource).not.toContain('Confirm');
  });

  it('routes bulk delete through the shared dialog and disables when nothing is selected', () => {
    const headAst = parseTemplate(headPath);
    const headSource = readFileSync(headPath, 'utf8');

    expect(collectElements(headAst, 'CartDeleteDialog')).toHaveLength(1);
    expect(headSource).toContain(':product-ids="selectedProductIds"');
    expect(headSource).toContain(':disabled="!canDeleteSelected"');
    expect(headSource).toContain('selectedItems.value > 0');
    expect(headSource).not.toContain('Delete all selected items?');
    expect(headSource).not.toContain('UiDialogTrigger');
  });

  it('uses the shared dialog for single-item deletes in the order summary table', () => {
    const itemSource = readFileSync(itemPath, 'utf8');
    const dropdownSource = readFileSync(itemDropdownPath, 'utf8');

    expect(collectElements(parseTemplate(itemPath), 'CartDeleteDialog')).toHaveLength(1);
    expect(collectElements(parseTemplate(itemDropdownPath), 'CartDeleteDialog')).toHaveLength(1);
    expect(itemSource).toContain(':product-ids="[item.id]"');
    expect(dropdownSource).toContain(':product-ids="[item.id]"');
  });
});
