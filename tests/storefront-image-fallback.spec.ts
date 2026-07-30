import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const storefrontSurfaces = [
  'components/home/FeaturedProducts.vue',
  'components/global/News.vue',
  'components/global/Manufacturers.vue',
  'components/global/EcxlusiveOffer.vue',
  'components/global/Banner.vue',
  'components/product/Banners.vue',
  'components/global/ProductCard.vue',
  'components/search/SearchItem.vue',
];

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
  const source = readFileSync(resolve(filePath), 'utf8');
  const { descriptor } = parseSfc(source);

  expect(descriptor.template).toBeTruthy();

  return baseParse(descriptor.template!.content);
}

describe('storefront ImageWithFallback adoption', () => {
  it.each(storefrontSurfaces)('uses ImageWithFallback instead of raw img in %s', (filePath) => {
    const ast = parseTemplate(filePath);
    const rawImages = collectElements(ast, 'img');
    const fallbackImages = collectElements(ast, 'ImageWithFallback');

    expect(rawImages).toHaveLength(0);
    expect(fallbackImages.length).toBeGreaterThan(0);
  });

  it('keeps stable merchandising media sizing on home promo and news surfaces', () => {
    const featuredProducts = readFileSync(resolve('components/home/FeaturedProducts.vue'), 'utf8');
    const news = readFileSync(resolve('components/global/News.vue'), 'utf8');
    const manufacturers = readFileSync(resolve('components/global/Manufacturers.vue'), 'utf8');

    expect(featuredProducts).toContain('ImageWithFallback');
    expect(featuredProducts).toContain('md:max-h-[240px]');
    expect(news).toContain('aspect-[1.69]');
    expect(news).toContain('object-cover');
    expect(manufacturers).toContain('max-h-8');
    expect(manufacturers).toContain('xl:h-[55px]');
  });
});
