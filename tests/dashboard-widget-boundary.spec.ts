import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseParse, NodeTypes, type ElementNode, type RootNode } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';

const returningCustomersPath = resolve('components/dashboard/ReturningCustomers.vue');
const boundaryPath = resolve('components/dashboard/DashboardWidgetBoundary.vue');
const faultComposablePath = resolve('composables/useDashboardWidgetFault.ts');

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

function parseTemplate(path: string) {
  const source = readFileSync(path, 'utf8');
  const { descriptor } = parseSfc(source);

  expect(descriptor.template).toBeTruthy();

  return baseParse(descriptor.template!.content);
}

describe('dashboard widget error boundaries', () => {
  it('wraps Returning Customers chart with DashboardWidgetBoundary', () => {
    const ast = parseTemplate(returningCustomersPath);
    const boundaries = collectElements(ast, 'DashboardWidgetBoundary');

    expect(boundaries).toHaveLength(1);
    expect(collectElements(ast, 'ReturningCustomersChart')).toHaveLength(1);
  });

  it('provides alert fallback UI with recovery navigation', () => {
    const ast = parseTemplate(boundaryPath);
    const alerts = collectElements(ast, 'div').filter((element) =>
      element.props.some(
        (prop) =>
          prop.type === NodeTypes.ATTRIBUTE &&
          prop.name === 'role' &&
          prop.value?.content === 'alert',
      ),
    );

    expect(alerts).toHaveLength(1);
    expect(readFileSync(boundaryPath, 'utf8')).toContain('NuxtErrorBoundary');
    expect(readFileSync(boundaryPath, 'utf8')).toContain('Try again');
    expect(readFileSync(boundaryPath, 'utf8')).toContain('NuxtLink');
  });

  it('supports mock-mode fault injection via dashboardFault query param', () => {
    const source = readFileSync(faultComposablePath, 'utf8');

    expect(source).toContain('dashboardFault');
    expect(source).toContain('MOCK_MODE');
    expect(readFileSync(resolve('components/dashboard/ReturningCustomersChart.vue'), 'utf8')).toContain(
      'useDashboardWidgetFault',
    );
  });
});
