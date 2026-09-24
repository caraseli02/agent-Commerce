import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const galleryPath = resolve('components/product/Gallery.vue');

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

function getDirectiveArgContent(prop: ElementNode['props'][number]): string | undefined {
  if (prop.type !== NodeTypes.DIRECTIVE || !prop.arg || prop.arg.type !== NodeTypes.SIMPLE_EXPRESSION) {
    return undefined;
  }

  return prop.arg.content;
}

function hasProp(element: ElementNode, name: string): boolean {
  return element.props.some((prop) => {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      return prop.name === name;
    }

    return getDirectiveArgContent(prop) === name;
  });
}

describe('product gallery layout regression', () => {
  it('fills the card with the full image and exposes gallery actions and thumbnails', () => {
    const source = readFileSync(galleryPath, 'utf8');
    const { descriptor } = parseSfc(source);

    expect(descriptor.template).toBeTruthy();

    const ast = baseParse(descriptor.template!.content);
    const root = collectElements(ast, 'div')[0];
    const imageNodes = collectElements(ast, 'ImageWithFallback');
    const heroImage = imageNodes[0];

    expect(root).toBeDefined();
    expect(heroImage).toBeDefined();
    if (!root || !heroImage) {
      throw new Error('Expected the gallery template to include its root and hero image');
    }

    expect(getStaticAttrValue(root, 'class')).toContain('lg:h-full');
    expect(getStaticAttrValue(root, 'class')).toContain('flex-col');
    expect(source).toContain('absolute');
    expect(source).toContain('aria-label="Share product"');
    expect(source).toContain('aria-label="View 3D preview"');
    expect(source).toContain('@click="shareProduct"');
    expect(source).toContain('@click="showPreviewModal = true"');
    expect(source).not.toContain('Swiper');
    expect(source).toContain('showThumbnails');
    expect(source).not.toContain('lg:hidden');
    expect(source).not.toContain('role="listitem"');
    expect(source).toContain('aria-pressed');
    expect(source).toContain('<ul');
    expect(source).toContain('Show product image');

    expect(hasProp(heroImage, 'class-name')).toBe(true);
    expect(getStaticAttrValue(heroImage, 'class-name')).toContain('h-full');
    expect(getStaticAttrValue(heroImage, 'class-name')).toContain('w-full');
    expect(getStaticAttrValue(heroImage, 'class-name')).toContain('object-contain');
    expect(getStaticAttrValue(heroImage, 'class-name')).not.toContain('object-cover');
  });
});
