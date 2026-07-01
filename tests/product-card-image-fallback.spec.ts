import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const productCardPath = resolve('components/global/ProductCard.vue');

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

function getStaticAttrValue(element: ElementNode, name: string): string | undefined {
  const attr = element.props.find((prop) => prop.type === NodeTypes.ATTRIBUTE && prop.name === name);

  return attr?.type === NodeTypes.ATTRIBUTE ? attr.value?.content : undefined;
}

function hasProp(element: ElementNode, name: string): boolean {
  return element.props.some((prop) => {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      return prop.name === name;
    }

    return prop.type === NodeTypes.DIRECTIVE && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === name;
  });
}

describe('storefront product card image fallback', () => {
  it('uses the shared fallback image component with stable card media sizing', () => {
    const source = readFileSync(productCardPath, 'utf8');
    const { descriptor } = parseSfc(source);

    expect(descriptor.template).toBeTruthy();

    const ast = baseParse(descriptor.template!.content);
    const rawImages = collectElements(ast, 'img');
    const fallbackImages = collectElements(ast, 'ImageWithFallback');

    expect(rawImages).toHaveLength(0);
    expect(fallbackImages).toHaveLength(1);

    const fallbackImage = fallbackImages[0];

    expect(hasProp(fallbackImage, 'src')).toBe(true);
    expect(hasProp(fallbackImage, 'alt')).toBe(true);
    expect(getStaticAttrValue(fallbackImage, 'class-name')).toContain('h-[120px]');
    expect(getStaticAttrValue(fallbackImage, 'class-name')).toContain('w-full');
    expect(getStaticAttrValue(fallbackImage, 'class-name')).toContain('object-contain');
    expect(source).toContain("!src.includes('not_valid_image')");
  });
});
