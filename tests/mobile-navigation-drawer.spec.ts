import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const mobileSheetPath = resolve('components/layout/header/main-menu/MobileSheet.vue');

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

describe('mobile navigation drawer', () => {
  it('opens from a native sheet trigger and closes with explicit mobile cleanup', () => {
    const source = readFileSync(mobileSheetPath, 'utf8');
    const ast = parseTemplate(mobileSheetPath);

    expect(source).toContain('const closeMobileMenu = () =>');
    expect(source).toContain('UiSheetTrigger as-child');
    expect(source).toContain('type="button"');
    expect(source).not.toContain('<UiButton\\n      variant="ghost"');

    const buttons = collectElements(ast, 'UiButton');
    expect(buttons.some((button) => button.props.some((prop) => 'name' in prop && prop.name === 'aria-label'))).toBe(true);
  });

  it('exposes primary navigation and constrains the drawer width for backdrop close', () => {
    const source = readFileSync(mobileSheetPath, 'utf8');
    const ast = parseTemplate(mobileSheetPath);

    expect(source).toContain('primaryNavItems');
    expect(source).toContain("label: 'How to Buy'");
    expect(source).toContain('w-[min(22rem,calc(100vw-2rem))]');

    const navElements = collectElements(ast, 'nav');
    expect(navElements).toHaveLength(1);
  });
});
