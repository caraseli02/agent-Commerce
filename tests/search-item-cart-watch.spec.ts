// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Vue from 'vue';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';

// #821: each /search row resyncs from the cart by identity; the store always replaces the cart,
// so a deep watcher only made every row traverse the whole cart on each write.

const Stub = Vue.defineComponent({ setup: () => () => Vue.h('span') });
const cart = Vue.ref<{ products: { id: string; stock: number }[] } | null>({ products: [{ id: 'p1', stock: 2 }] });
const initializeQuantities = vi.fn();

const modules: Record<string, unknown> = {
  vue: Vue,
  pinia: { storeToRefs: (store: object) => store },
  '~/components/global/ImageWithFallback.vue': { default: Stub },
  '~/store/authStore': { useAuthStore: () => ({ getUserDetails: Vue.ref(null) }) },
  '~/store/cartStore': { useCartStore: () => ({ cart }) },
  '~~/helpers/product-datasheet': { getProductDatasheet: () => null, getProductDatasheetUrl: () => null },
  '~~/helpers/prices.helper': { addToCartHelper: vi.fn(), initializeQuantities, parseProductPriceConfiguration: () => ({}) },
  '~/composables/useCart': { useCart: () => ({ isProductAddInFlight: () => false }) },
};

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
  new Function('require', 'exports', 'ref', 'computed', 'watch', outputText)(requireDependency, exported, Vue.ref, Vue.computed, Vue.watch);
  return exported.default!;
};

const SearchItem = load('app/components/search/SearchItem.vue');

const apps: Vue.App[] = [];
const mountRow = async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const app = Vue.createApp({
    render: () => Vue.h(Vue.Suspense, null, { default: () => Vue.h(SearchItem, { item: { _id: 'p1', name: 'Regulator', stock: 5 } }) }),
  });
  app.config.warnHandler = () => {};
  for (const name of ['NuxtLink', 'UiButton', 'CopyClipboard', 'QuantityButtons']) app.component(name, Stub);
  apps.push(app);
  app.mount(container);
  await vi.waitFor(() => expect(initializeQuantities).toHaveBeenCalled());
};

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  initializeQuantities.mockClear();
});

describe('/search row cart sync', () => {
  it('resyncs the row when the cart is replaced', async () => {
    await mountRow();
    expect(initializeQuantities).toHaveBeenCalledTimes(1);

    const next = { products: [{ id: 'p1', stock: 4 }] };
    cart.value = next;
    await Vue.nextTick();

    expect(initializeQuantities).toHaveBeenCalledTimes(2);
    expect(initializeQuantities.mock.calls[1]![1]).toStrictEqual(next);
  });

  it('does not traverse the cart for nested in-place changes', async () => {
    await mountRow();

    cart.value!.products[0]!.stock = 9;
    await Vue.nextTick();

    expect(initializeQuantities).toHaveBeenCalledTimes(1);
  });
});
