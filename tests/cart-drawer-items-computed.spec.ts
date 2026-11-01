// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import * as Vue from 'vue';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';

// #875: the cart drawer derives its rows from the fields it renders instead of deep-watching the whole cart.

type Line = {
  id: string;
  stock: number;
  backorder_stock?: number;
  productEntity: { name: string; details: { ProductImage: { ProductImageSmall: string }; specs: { weight: number } } };
};

const Stub = Vue.defineComponent({ setup: () => () => Vue.h('span') });
const rowRenders: string[] = [];
const Row = Vue.defineComponent({
  props: { product: { type: Object, required: true } },
  setup: (props) => () => {
    const product = props.product as { id: string; title: string; image?: string; quantity: number };
    rowRenders.push(product.id);
    return Vue.h('div', { class: 'row' }, `${product.id}|${product.title}|${product.image}|${product.quantity}`);
  },
});

const line = (id: string, stock: number, backorder = 0): Line => ({
  id,
  stock,
  backorder_stock: backorder,
  productEntity: { name: `Part ${id}`, details: { ProductImage: { ProductImageSmall: `${id}.png` }, specs: { weight: 1 } } },
});
const cart = Vue.ref<{ products: Line[] } | null>(null);

const modules: Record<string, unknown> = {
  vue: Vue,
  pinia: { storeToRefs: (store: object) => store },
  '~/composables/useCart': { useCart: () => ({ removeFromCart: async () => null, refreshCart: async () => null }) },
  '~/components/layout/favorites-cart-modal/cart/CartProductItem.vue': { default: Row },
  '~/store/cartStore': { useCartStore: () => ({ cart, getCartSubtotal: Vue.ref(0) }) },
  '~/composables/loadCartRead': { cartReadCacheKey: () => 'cart-read-test', loadCartRead: async () => null },
  '~/components/global/empty-state-presets': { cartEmptyPreset: {}, cartErrorPreset: {} },
};
const useAsyncData = () => ({ pending: Vue.ref(false), error: Vue.ref(null), refresh: async () => {} });

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
  new Function('require', 'exports', 'ref', 'computed', 'watch', 'useAsyncData', outputText)(
    requireDependency,
    exported,
    Vue.ref,
    Vue.computed,
    Vue.watch,
    useAsyncData,
  );
  return exported.default!;
};

const CartPanel = load('app/components/layout/favorites-cart-modal/cart/Index.vue');

const apps: Vue.App[] = [];
const mountPanel = () => {
  const container = document.createElement('div');
  document.body.append(container);
  const app = Vue.createApp({ render: () => Vue.h(CartPanel) });
  app.config.warnHandler = () => {};
  for (const name of ['NuxtLink', 'EmptyState']) app.component(name, Stub);
  apps.push(app);
  app.mount(container);
  return container;
};
const rows = (container: Element) => [...container.querySelectorAll('.row')].map((row) => row.textContent);

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  rowRenders.splice(0);
  cart.value = null;
});

describe('cart drawer rows', () => {
  it('renders the cart lines and follows cart and product-list replacement', async () => {
    cart.value = { products: [line('p1', 2, 1)] };
    const container = mountPanel();
    expect(rows(container)).toStrictEqual(['p1|Part p1|p1.png|3']);

    cart.value = { products: [line('p1', 4), line('p2', 1)] };
    await Vue.nextTick();
    expect(rows(container)).toStrictEqual(['p1|Part p1|p1.png|4', 'p2|Part p2|p2.png|1']);

    // The order-summary table replaces cart.products in place (Table.vue onMounted).
    cart.value.products = [line('p2', 5)];
    await Vue.nextTick();
    expect(rows(container)).toStrictEqual(['p2|Part p2|p2.png|5']);
  });

  it('updates a row when its quantity changes in place', async () => {
    cart.value = { products: [line('p1', 2)] };
    const container = mountPanel();

    cart.value.products[0]!.backorder_stock = 3;
    await Vue.nextTick();

    expect(rows(container)).toStrictEqual(['p1|Part p1|p1.png|5']);
  });

  it('does not rebuild the rows for an unread nested product field', async () => {
    cart.value = { products: [line('p1', 2), line('p2', 1)] };
    mountPanel();
    expect(rowRenders).toStrictEqual(['p1', 'p2']);

    cart.value.products[0]!.productEntity.details.specs.weight = 9;
    await Vue.nextTick();

    expect(rowRenders).toStrictEqual(['p1', 'p2']);
  });
});
