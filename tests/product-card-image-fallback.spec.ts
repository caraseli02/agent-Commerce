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
    expect(fallbackImage).toBeDefined();
    if (!fallbackImage) {
      throw new Error('Expected the product card to render an ImageWithFallback');
    }

    expect(hasProp(fallbackImage, 'src')).toBe(true);
    expect(hasProp(fallbackImage, 'alt')).toBe(true);
    expect(getStaticAttrValue(fallbackImage, 'class-name')).toContain('h-full');
    expect(getStaticAttrValue(fallbackImage, 'class-name')).toContain('w-full');
    expect(getStaticAttrValue(fallbackImage, 'class-name')).toContain('object-cover');
    expect(source).toContain('aspect-square');
    expect(source).toContain('md:h-[160px]');
    expect(source).toContain('bg-white');
    expect(source).not.toContain('bg-slate-50');
    expect(source).toContain("!src.includes('not_valid_image')");
  });

  it('hides nonfunctional product options on desktop and lets long titles wrap', () => {
    const { descriptor } = parseSfc(readFileSync(productCardPath, 'utf8'));

    expect(descriptor.template).toBeTruthy();

    const ast = baseParse(descriptor.template!.content);
    const optionsButton = collectElements(ast, 'button').find((button) => getStaticAttrValue(button, 'aria-label') === 'Product options');
    const title = collectElements(ast, 'h3')[0];
    const menuWrapper = collectElements(ast, 'div').find((el) => {
      const className = getStaticAttrValue(el, 'class') || '';
      return className.includes('md:hidden') && className.includes('ml-auto') && className.includes('shrink-0');
    });
    const menuItems = collectElements(ast, 'UiDropdownMenuItem');
    const dropdownMenu = collectElements(ast, 'UiDropdownMenu')[0];

    expect(optionsButton).toBeTruthy();
    expect(menuWrapper).toBeTruthy();
    expect(menuItems).toHaveLength(2);
    expect(title).toBeDefined();
    expect(dropdownMenu).toBeDefined();
    if (!title || !dropdownMenu) {
      throw new Error('Expected the product card title and dropdown menu');
    }
    expect(
      menuItems.map((item) => {
        const textNode = item.children.find((child) => child.type === NodeTypes.TEXT);
        return textNode && 'content' in textNode ? textNode.content.trim() : '';
      }),
    ).toEqual(['Share', '3D view']);
    expect(getStaticAttrValue(title, 'class')).toContain('min-w-0');
    expect(getStaticAttrValue(title, 'class')).toContain('break-words');
    expect(getStaticAttrValue(title, 'class')).not.toContain('overflow-hidden');
    expect(getStaticAttrValue(title, 'class')).not.toContain('truncate');
    // Class must live on a real DOM wrapper — UiDropdownMenu/Root does not forward class attrs.
    expect(getStaticAttrValue(dropdownMenu, 'class')).toBeUndefined();
  });
  it('keeps the mobile card compact while preserving desktop card behavior', () => {
    const source = readFileSync(productCardPath, 'utf8');
    const { descriptor } = parseSfc(source);

    expect(descriptor.template).toBeTruthy();

    const ast = baseParse(descriptor.template!.content);
    const rootCard = collectElements(ast, 'div')[0];
    const cartButton = collectElements(ast, 'button').find((button) => getStaticAttrValue(button, 'aria-label') === 'Add product to cart');
    const actionsGroup = collectElements(ast, 'div').find((el) => getStaticAttrValue(el, 'aria-label') === 'Product actions');

    expect(rootCard).toBeDefined();
    if (!rootCard) {
      throw new Error('Expected the product card root element');
    }

    expect(getStaticAttrValue(rootCard, 'class')).toContain('grid-cols-[108px_minmax(0,1fr)]');
    expect(getStaticAttrValue(rootCard, 'class')).toContain('md:flex');
    expect(getStaticAttrValue(rootCard, 'class')).toContain('md:min-h-[280px]');

    expect(cartButton).toBeTruthy();
    expect(getStaticAttrValue(cartButton!, 'class')).toContain('col-start-2');
    expect(getStaticAttrValue(cartButton!, 'class')).toContain('md:absolute');
    expect(getStaticAttrValue(cartButton!, 'type')).toBe('button');

    expect(actionsGroup).toBeUndefined();
    expect(source).not.toContain('aria-label="Product actions"');
    expect(source).not.toContain('SvgoCardHeartIcon');
    expect(source).not.toContain('SvgoCardShareIcon');
    expect(source).not.toContain('SvgoCardD3Icon');
  });

  it('links only the image and title to the product page', () => {
    const source = readFileSync(productCardPath, 'utf8');
    const { descriptor } = parseSfc(source);

    expect(descriptor.template).toBeTruthy();

    const ast = baseParse(descriptor.template!.content);
    const links = collectElements(ast, 'NuxtLink');
    const imageLink = links.find((link) => hasProp(link, 'aria-label'));
    const titleLink = collectElements(ast, 'h3')[0]?.children.find((child) => child.type === NodeTypes.ELEMENT) as ElementNode | undefined;

    expect(links).toHaveLength(2);
    expect(imageLink).toBeTruthy();
    expect(titleLink?.tag).toBe('NuxtLink');
    expect(hasProp(imageLink!, 'to')).toBe(true);
    expect(hasProp(titleLink!, 'to')).toBe(true);
    expect(source).not.toContain('absolute inset-0');
    expect(source).toContain('group-hover:scale-[1.02]');
    expect(getStaticAttrValue(titleLink!, 'class')).toContain('hover:underline');
    expect(getStaticAttrValue(titleLink!, 'class')).toContain('hover:text-blue-600');
  });
});
