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
  const attr = element.props.find(
    prop => prop.type === NodeTypes.ATTRIBUTE && prop.name === name,
  );

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

describe('product gallery layout regression', () => {
  it('keeps image sizing classes on ImageWithFallback call sites', () => {
    const source = readFileSync(galleryPath, 'utf8');
    const { descriptor } = parseSfc(source);

    expect(descriptor.template).toBeTruthy();

    const ast = baseParse(descriptor.template!.content);
    const imageNodes = collectElements(ast, 'ImageWithFallback');

    expect(imageNodes).toHaveLength(2);

    for (const node of imageNodes) {
      expect(hasProp(node, 'class-name')).toBe(true);
    }

    expect(hasProp(imageNodes[0], 'class')).toBe(false);
    expect(hasProp(imageNodes[1], 'class')).toBe(true);

    expect(getStaticAttrValue(imageNodes[0], 'class-name')).toContain('w-[284px]');
    expect(getStaticAttrValue(imageNodes[0], 'class-name')).toContain('h-[160px]');
    expect(getStaticAttrValue(imageNodes[0], 'class-name')).toContain('object-contain');

    expect(getStaticAttrValue(imageNodes[1], 'class-name')).toContain('w-[60px]');
    expect(getStaticAttrValue(imageNodes[1], 'class-name')).toContain('h-[50px]');
    expect(getStaticAttrValue(imageNodes[1], 'class-name')).toContain('object-contain');
    const thumbnailClass = imageNodes[1].props.find(
      prop => prop.type === NodeTypes.DIRECTIVE && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === 'class',
    );
    expect(thumbnailClass?.type === NodeTypes.DIRECTIVE ? thumbnailClass.exp?.content : '').toContain('opacity-50');
  });
});
