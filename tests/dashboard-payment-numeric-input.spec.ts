// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Vue from 'vue';
import { useVModel } from '@vueuse/core';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import { cn } from '../app/lib/utils';
import { addDays } from 'date-fns';

const source = readFileSync(resolve(process.cwd(), 'app/components/ui/input/Input.vue'), 'utf8');
const { descriptor } = parse(source);
const compiled = compileScript(descriptor, { id: 'dashboard-payment-numeric-input', inlineTemplate: true });
const { outputText } = ts.transpileModule(compiled.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const exported: { default?: Vue.Component } = {};
const requireDependency = (id: string) => {
  if (id === 'vue') return Vue;
  if (id === '@vueuse/core') return { useVModel };
  if (id === '@/lib/utils') return { cn };
  throw new Error(`Unconfigured component dependency: ${id}`);
};
new Function('require', 'exports', outputText)(requireDependency, exported);
const UiInput = exported.default!;

const Icon = Vue.defineComponent({ setup: () => () => Vue.h('svg', { 'aria-hidden': 'true' }) });
const UiButton = Vue.defineComponent({
  inheritAttrs: false,
  setup:
    (_props, { attrs, slots }) =>
    () =>
      Vue.h('button', attrs, slots.default?.()),
});
const SkeletonLoader = Vue.defineComponent({ render: () => Vue.h('div') });
const creditFixture = {
  limit: 12000,
  spent: 3200,
  available: 8800,
  dueDate: '2026-10-22T00:00:00.000Z',
  tillDue: '30',
  term: 30,
  freeze: false,
  active: true,
};

const compileSettingsComponent = (fileName: string, id: string, controlPanel: Record<string, unknown>) => {
  const componentSource = readFileSync(resolve(process.cwd(), fileName), 'utf8');
  const { descriptor: componentDescriptor } = parse(componentSource);
  const componentCompiled = compileScript(componentDescriptor, { id, inlineTemplate: true });
  const { outputText: componentOutput } = ts.transpileModule(componentCompiled.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const componentExported: { default?: Vue.Component } = {};
  const dependencies: Record<string, unknown> = {
    'date-fns': { addDays },
    '~~/helpers/reviewer-dates': { formatReviewerDate: (value?: string) => value ?? '-' },
    '~/composables/useControlPanel': { useControlPanel: () => controlPanel },
    '~/composables/useMockMode': { useMockMode: () => ({ isMockMode: Vue.ref(false) }) },
  };
  const componentRequire = (dependency: string) => {
    if (dependency === 'vue') return Vue;
    if (dependency.endsWith('.svg')) return { default: Icon };
    if (!(dependency in dependencies)) throw new Error(`Unconfigured component dependency: ${dependency}`);
    return dependencies[dependency];
  };
  new Function('require', 'exports', 'ref', 'computed', 'useRuntimeConfig', componentOutput)(
    componentRequire,
    componentExported,
    Vue.ref,
    Vue.computed,
    () => ({ public: { MOCK_MODE: false } }),
  );
  return componentExported.default!;
};

const apps: Vue.App[] = [];
const mountNumericInput = (model: Vue.Ref<string | number>, onUpdate: (value: string | number) => void) => {
  const container = document.createElement('div');
  document.body.append(container);
  const Host = Vue.defineComponent({
    setup: () => () =>
      Vue.h(UiInput, {
        modelValue: model.value,
        type: 'number',
        'onUpdate:modelValue': onUpdate,
      }),
  });
  const app = Vue.createApp(Host);
  apps.push(app);
  app.mount(container);
  return container;
};

const mountSettingsComponent = (component: Vue.Component, props: Record<string, unknown>) => {
  const container = document.createElement('div');
  document.body.append(container);
  const Host = Vue.defineComponent({
    setup: () => () =>
      Vue.h(Vue.Suspense, null, {
        default: () => Vue.h(component, props),
        fallback: () => Vue.h('div', 'Loading settings'),
      }),
  });
  const app = Vue.createApp(Host);
  app.component('UiInput', UiInput);
  app.component('UiButton', UiButton);
  app.component('SkeletonLoader', SkeletonLoader);
  app.directive('click-outside', {});
  apps.push(app);
  app.mount(container);
  return container;
};

const button = (container: HTMLElement, label: string) => {
  const match = [...container.querySelectorAll('button')].find((element) => element.textContent?.includes(label));
  expect(match, `Missing button: ${label}`).toBeDefined();
  return match!;
};

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

describe('dashboard payment numeric inputs', () => {
  it('inherits number type and preserves numeric, decimal, empty, and parent model updates', async () => {
    const model = Vue.ref<string | number>(0);
    const onUpdate = vi.fn((value: string | number) => {
      model.value = value;
    });
    const container = mountNumericInput(model, onUpdate);
    const input = container.querySelector('input');

    expect(input).not.toBeNull();
    expect(input!.type).toBe('number');
    expect(input!.value).toBe('0');

    model.value = 4.25;
    await Vue.nextTick();
    expect(input!.value).toBe('4.25');

    input!.value = '12.5';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    await Vue.nextTick();
    await Vue.nextTick();

    expect(model.value).toBe(12.5);
    expect(typeof model.value).toBe('number');
    expect(onUpdate).toHaveBeenNthCalledWith(1, 12.5);
    expect(input!.value).toBe('12.5');

    input!.value = '';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    await Vue.nextTick();
    await Vue.nextTick();

    expect(model.value).toBe('');
    expect(typeof model.value).toBe('string');
    expect(onUpdate).toHaveBeenNthCalledWith(2, '');
    expect(input!.value).toBe('');
  });

  it('saves the discount as a number and cancellation as numeric zero', async () => {
    const loadCustomerDiscount = vi.fn().mockResolvedValue(10);
    const saveCustomerDiscount = vi.fn().mockResolvedValue(true);
    const component = compileSettingsComponent(
      'app/components/dashboard/control-panel/settings-view/CustomerDiscount.vue',
      'dashboard-customer-discount',
      { loadCustomerDiscount, saveCustomerDiscount },
    );
    const container = mountSettingsComponent(component, { id: 'customer-001' });
    await vi.waitFor(() => expect(container.querySelector('input')).not.toBeNull());

    const input = container.querySelector('input')!;
    expect(input.type).toBe('number');
    input.value = '12.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Vue.nextTick();
    await Vue.nextTick();
    button(container, 'Update Discount').click();
    await vi.waitFor(() => expect(saveCustomerDiscount).toHaveBeenCalledOnce());

    expect(saveCustomerDiscount).toHaveBeenCalledExactlyOnceWith(12.5, 'customer-001');
    expect(typeof saveCustomerDiscount.mock.calls[0][0]).toBe('number');

    button(container, 'Cancel Discount').click();
    await vi.waitFor(() => expect(saveCustomerDiscount).toHaveBeenCalledTimes(2));
    expect(saveCustomerDiscount).toHaveBeenNthCalledWith(2, 0, 'customer-001');
    expect(typeof saveCustomerDiscount.mock.calls[1][0]).toBe('number');
  });

  it('saves credit with a numeric term and string limit, then updates the displayed limit', async () => {
    const fetchCustomerCredit = vi.fn().mockResolvedValue({ status: 'success', data: { ...creditFixture } });
    const updateCustomerCredit = vi.fn().mockResolvedValue({ status: 'success' });
    const closed = vi.fn();
    const component = compileSettingsComponent(
      'app/components/dashboard/control-panel/settings-view/CustomerCreditEdit.vue',
      'dashboard-customer-credit-edit',
      {
        fetchCustomerCredit,
        updateCustomerCredit,
        toggleCloseCustomerCredit: vi.fn(),
        toggleFreezeCustomerCredit: vi.fn(),
      },
    );
    const container = mountSettingsComponent(component, { id: 'customer-001', onClose: closed });
    await vi.waitFor(() => expect(container.querySelector('input')).not.toBeNull());
    expect(container.textContent).toContain('12,000.00 Lei');

    button(container, 'Select Credit Term').click();
    await Vue.nextTick();
    button(container, '15 Days').click();
    const input = container.querySelector('input')!;
    expect(input.type).toBe('number');
    input.value = '1500.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Vue.nextTick();
    await Vue.nextTick();
    button(container, 'Save').click();

    await vi.waitFor(() => expect(updateCustomerCredit).toHaveBeenCalledOnce());
    expect(updateCustomerCredit).toHaveBeenCalledExactlyOnceWith(15, '1500.5', 'customer-001');
    expect(typeof updateCustomerCredit.mock.calls[0][0]).toBe('number');
    expect(typeof updateCustomerCredit.mock.calls[0][1]).toBe('string');
    expect(closed).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(container.textContent).toContain('1,500.50 Lei'));
  });
});
