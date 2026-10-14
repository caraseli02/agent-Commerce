import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cartPanelPath = resolve(repoRoot, 'app/components/layout/favorites-cart-modal/cart/Index.vue');
const productItemPath = resolve(repoRoot, 'app/components/layout/favorites-cart-modal/cart/CartProductItem.vue');

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

function parseTemplate(filePath: string): RootNode {
  const source = readFileSync(filePath, 'utf8');
  const { descriptor } = parseSfc(source);

  expect(descriptor.template).toBeTruthy();

  return baseParse(descriptor.template!.content);
}

describe('cart side-panel thumbnails', () => {
  it('maps cart product thumbnails through a defensive extractor', () => {
    const source = readFileSync(cartPanelPath, 'utf8');

    expect(source).toContain('getCartProductThumbnail');
    expect(source).toContain('Array.isArray(productImage)');
    expect(source).toContain('image: getCartProductThumbnail(item)');
    // Explicit import avoids the wrong Nuxt auto-name LayoutFavoritesCartModalCartCartProductItem
    expect(source).toContain('import CartProductItem');
    expect(source).toContain('<CartProductItem');
    expect(source).not.toContain('LayoutFavoritesCartModalCartCartProductItem');
  });

  it('shows empty-state shopping CTA instead of checkout when the cart is empty', () => {
    const panelSource = readFileSync(cartPanelPath, 'utf8');
    const presetSource = readFileSync(resolve(repoRoot, 'app/components/global/empty-state-presets.ts'), 'utf8');

    expect(panelSource).toContain('hasItems');
    expect(panelSource).toContain('v-if="hasItems"');
    expect(panelSource).toContain('cartEmptyPreset');
    // Auto-import registers EmptyState only; an unimported <GlobalEmptyState> renders nothing (#686).
    expect(panelSource).toContain('<EmptyState');
    expect(panelSource).not.toContain('<GlobalEmptyState');
    expect(presetSource).toContain("primaryLabel: 'Start shopping'");
    expect(panelSource).toMatch(/NuxtLink[\s\S]*v-if="hasItems"[\s\S]*Go to Checkout/);
  });

  it('renders cart rows through the shared fallback image with stable thumbnail sizing', () => {
    const source = readFileSync(productItemPath, 'utf8');
    const productItemAst = parseTemplate(productItemPath);

    expect(collectElements(productItemAst, 'NuxtImg')).toHaveLength(0);
    expect(collectElements(productItemAst, 'ImageWithFallback')).toHaveLength(1);
    expect(source).toContain(':class-name="thumbnailClass"');
    expect(source).toContain('w-12 h-12');
    expect(source).toContain('md:w-14 md:h-14');
  });
});
