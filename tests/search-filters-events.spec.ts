// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Vue from 'vue';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import { createPinia, setActivePinia } from 'pinia';
import { useTrimText } from '~/composables/text';
import { useProductStore } from '~/store/productStore';

// #812: the /search slice talks through component emits and the product store, not the tiny-emitter bus.

const Stub = Vue.defineComponent({ setup: () => () => Vue.h('span') });
const Button = Vue.defineComponent({
  inheritAttrs: false,
  setup:
    (_props, { attrs, slots }) =>
    () =>
      Vue.h('button', attrs, slots.default?.()),
});
const Checkbox = Vue.defineComponent({
  props: { checked: Boolean },
  emits: ['update:checked'],
  setup:
    (props, { attrs, emit }) =>
    () =>
      Vue.h('input', { ...attrs, type: 'checkbox', checked: props.checked, onClick: () => emit('update:checked', !props.checked) }),
});
const modules: Record<string, unknown> = { vue: Vue, '@lucide/vue': { PlusIcon: Stub }, '@/composables/text': { useTrimText } };

// Compile the real SFC; Nuxt auto-imports are passed in as globals, svg icons are stubbed.
const load = (path: string) => {
  const { descriptor } = parse(readFileSync(resolve(path), 'utf8'));
  const compiled = compileScript(descriptor, { id: path, inlineTemplate: true });
  const { outputText } = ts.transpileModule(compiled.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exported: { default?: Vue.Component } = {};
  const requireDependency = (id: string) => {
    if (id.endsWith('.svg')) return { default: Stub };
    if (!(id in modules)) throw new Error(`Unconfigured component dependency: ${id}`);
    return modules[id];
  };
  new Function('require', 'exports', 'ref', 'computed', 'watch', 'useId', outputText)(
    requireDependency,
    exported,
    Vue.ref,
    Vue.computed,
    Vue.watch,
    Vue.useId,
  );
  return exported.default!;
};

const Filter = load('app/components/search/Filter.vue');
const Filters = load('app/components/search/Filters.vue');

const option = (value: string) => ({ FeatureID: 'voltage', FeatureName: 'Voltage', FeatureValue: value, FeatureUnit: 'V', count: 2 });
const filters = { Voltage: [option('5'), option('12')] };

const apps: Vue.App[] = [];
const mountFilters = (keyword: Vue.Ref<string>, onRegister: (options: unknown[]) => void, onReset: () => void) => {
  const container = document.createElement('div');
  document.body.append(container);
  const app = Vue.createApp({
    render: () =>
      Vue.h(Filters, {
        filters,
        keyword: keyword.value,
        atPage: 1,
        perPage: 10,
        onRegisterFilterOption: onRegister,
        onResetProductsFilters: onReset,
      }),
  });
  app.component('SearchFilter', Filter);
  app.component('UiButton', Button);
  app.component('UiCheckbox', Checkbox);
  for (const name of ['UiInput', 'UiLabel', 'UiSwitch', 'LayoutSearchFiltersModal', 'LayoutAddRemoveSearchFilter'])
    app.component(name, Stub);
  apps.push(app);
  app.mount(container);
  return container;
};

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

describe('/search filter events', () => {
  it('reports ticked filter options to the page and clears them for a new keyword', async () => {
    const keyword = Vue.ref('regulator');
    const onRegister = vi.fn();
    const container = mountFilters(keyword, onRegister, vi.fn());
    const boxes = () => [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(boxes()).toHaveLength(2);

    boxes()[0]!.click();
    boxes()[1]!.click();
    expect(onRegister).toHaveBeenLastCalledWith([option('5'), option('12')]);

    boxes()[0]!.click();
    await Vue.nextTick();
    expect(onRegister).toHaveBeenLastCalledWith([option('12')]);

    keyword.value = 'capacitor';
    await Vue.nextTick();
    boxes()[0]!.click();
    expect(onRegister).toHaveBeenLastCalledWith([option('5')]);
  });

  it('asks the page to reset filters', () => {
    const onReset = vi.fn();
    const container = mountFilters(Vue.ref(''), vi.fn(), onReset);
    const reset = [...container.querySelectorAll('button')].find((element) => element.textContent?.includes('Reset Filters'));

    reset!.click();
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe('header search keyword', () => {
  it('publishes a new value for every header search, including a repeated keyword', () => {
    setActivePinia(createPinia());
    const store = useProductStore();
    const seen: unknown[] = [];
    Vue.watch(
      () => store.headerSearch,
      (value) => seen.push(value),
      { flush: 'sync' },
    );

    store.setHeaderSearch('ADM2587E');
    store.setHeaderSearch('ADM2587E');
    expect(seen).toEqual([{ keyword: 'ADM2587E' }, { keyword: 'ADM2587E' }]);
  });
});

describe('/search slice', () => {
  it.each([
    'app/pages/search.vue',
    'app/components/search/Filters.vue',
    'app/components/search/Filter.vue',
    'app/components/layout/header/Search.vue',
    'app/components/layout/header/MainRow.vue',
  ])('%s does not use the tiny-emitter bus', (path) => {
    expect(readFileSync(resolve(path), 'utf8')).not.toMatch(/tiny-emitter|Emitter\./);
  });
});
