import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const imageWithFallbackPath = resolve('components/global/ImageWithFallback.vue');
const zoomGalleryPath = resolve('components/product/ZoomGallery.vue');
const zoomImgPath = resolve('components/product/ZoomImg.vue');

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

function getStaticAttrValue(element: ElementNode, name: string): string | undefined {
  const attr = element.props.find((prop) => prop.type === NodeTypes.ATTRIBUTE && prop.name === name);

  return attr?.type === NodeTypes.ATTRIBUTE ? attr.value?.content : undefined;
}

describe('product detail image fallback', () => {
  it('normalizes known invalid image URLs in the shared fallback component', () => {
    const source = readFileSync(imageWithFallbackPath, 'utf8');

    expect(source).toContain('normalizeImageSrc');
    expect(source).toContain('not_valid_image');
    expect(source).toContain('checkImageHealth');
    expect(source).toContain('naturalWidth === 0');
  });

  it('fills the media frame with an absolute full-bleed catalog fallback', () => {
    const source = readFileSync(imageWithFallbackPath, 'utf8');
    const { descriptor } = parseSfc(source);

    expect(descriptor.template).toBeTruthy();

    const ast = baseParse(descriptor.template!.content);
    const root = collectElements(ast, 'div')[0];
    const fallbackSurface = collectElements(ast, 'div').find(
      (el) => getStaticAttrValue(el, 'role') === 'img' && (getStaticAttrValue(el, 'class') || '').includes('absolute inset-0'),
    );
    const packageIcon = collectElements(ast, 'Package')[0];

    expect(getStaticAttrValue(root, 'class')).toContain('relative block');
    expect(fallbackSurface).toBeTruthy();
    expect(getStaticAttrValue(fallbackSurface!, 'class')).toContain('bg-light-200');
    expect(getStaticAttrValue(fallbackSurface!, 'class')).toContain('ring-1');
    expect(packageIcon).toBeTruthy();
    expect(getStaticAttrValue(packageIcon, 'class')).toContain('text-slate-400');
    expect(getStaticAttrValue(packageIcon, 'aria-hidden')).toBe('true');
    expect(source).not.toContain('unsplash');
    expect(source).not.toContain('bg-cover');
    expect(source).not.toContain('ImageOff');
    expect(source).not.toContain('w-12 h-12');
  });

  it('keeps the product zoom modal on fallback-aware image rendering', () => {
    const zoomGalleryAst = parseTemplate(zoomGalleryPath);
    const zoomImgAst = parseTemplate(zoomImgPath);

    expect(collectElements(zoomGalleryAst, 'NuxtImg')).toHaveLength(0);
    expect(collectElements(zoomGalleryAst, 'ImageWithFallback')).toHaveLength(1);
    expect(collectElements(zoomImgAst, 'NuxtImg')).toHaveLength(0);
    expect(collectElements(zoomImgAst, 'ImageWithFallback')).toHaveLength(1);
  });
});
