import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const cartPanelPath = resolve('app/components/layout/favorites-cart-modal/cart/Index.vue');
const productItemPath = resolve('app/components/layout/favorites-cart-modal/cart/CartProductItem.vue');

function scriptSetup(filePath: string) {
  const { descriptor } = parseSfc(readFileSync(filePath, 'utf8'));

  expect(descriptor.scriptSetup).toBeTruthy();

  return descriptor.scriptSetup!.content;
}

describe('cart drawer line removal (#871)', () => {
  it('lets the line item only announce the removal', () => {
    const itemScript = scriptSetup(productItemPath);

    // Removing here unmounted the row first, so the drawer's handler (and its catch) never ran.
    expect(itemScript).not.toContain('removeFromCart');
    expect(itemScript).not.toContain('useCart');
    expect(itemScript).toMatch(/emits\('delete-product', props\.product\)/);
  });

  it('removes the line once from the drawer', () => {
    const panelSource = readFileSync(cartPanelPath, 'utf8');
    const panelScript = scriptSetup(cartPanelPath);

    expect(panelSource).toContain('@delete-product="deleteProduct"');
    expect(panelScript.match(/removeFromCart\(/g)).toHaveLength(1);
    expect(panelScript).toMatch(/const deleteProduct = async[\s\S]*removeFromCart\(\{ products: \[object\.id\] \}\)/);
  });
});
