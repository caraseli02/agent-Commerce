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

describe('product detail image fallback', () => {
  it('normalizes known invalid image URLs in the shared fallback component', () => {
    const source = readFileSync(imageWithFallbackPath, 'utf8');

    expect(source).toContain('normalizeImageSrc');
    expect(source).toContain('not_valid_image');
    expect(source).toContain('checkImageHealth');
    expect(source).toContain('naturalWidth === 0');
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
