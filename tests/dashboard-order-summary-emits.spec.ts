// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Vue from 'vue';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';

// #815: the dashboard and order summary talk to their parent pages through component emits, not the tiny-emitter bus.

const Stub = Vue.defineComponent({ setup: () => () => Vue.h('span') });
const Button = Vue.defineComponent({
  inheritAttrs: false,
  setup:
    (_props, { attrs, slots }) =>
    () =>
      Vue.h('button', attrs, slots.default?.()),
});
const Textarea = Vue.defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup:
    (props, { attrs, emit }) =>
    () =>
      Vue.h('textarea', {
        ...attrs,
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
      }),
});
const activeOrderFilter = Vue.ref({ value: 'home' });
const modules: Record<string, unknown> = { vue: Vue };

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
  new Function('require', 'exports', 'ref', 'useCustomerDashboard', 'useRoute', outputText)(
    requireDependency,
    exported,
    Vue.ref,
    () => ({ activeOrderFilter }),
    () => ({ query: {} }),
  );
  return exported.default!;
};

const NoteSection = load('app/components/order-summary/NoteSection.vue');
const RecentlyBought = load('app/components/dashboard/client/RecentlyBought.vue');
const PaymentCard = load('app/components/dashboard/client/PaymentCard.vue');

const apps: Vue.App[] = [];
const mount = (component: Vue.Component, props: Record<string, unknown>) => {
  const container = document.createElement('div');
  document.body.append(container);
  const app = Vue.createApp({ render: () => Vue.h(component, props) });
  app.component('UiButton', Button);
  app.component('UiTextarea', Textarea);
  app.component('NuxtImg', Stub);
  for (const name of ['SvgoArrowLeft16', 'SvgoCheckCircle20', 'SvgoEditGray24', 'SvgoNotFound', 'SvgoNotFoundSmall']) {
    app.component(name, Stub);
  }
  apps.push(app);
  app.mount(container);
  return container;
};
const button = (container: HTMLElement, text: string) => {
  const match = [...container.querySelectorAll('button')].find((element) => element.textContent?.includes(text));
  expect(match, `Missing button: ${text}`).toBeDefined();
  return match!;
};
const openNote = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button[aria-label="Edit order note"]')!.click();
const writeNote = async (container: HTMLElement, text: string) => {
  const textarea = container.querySelector('textarea')!;
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  await Vue.nextTick();
  textarea.dispatchEvent(new Event('focusout'));
};

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  activeOrderFilter.value = { value: 'home' };
});

describe('order summary note emit', () => {
  it('emits each changed note once on focusout', async () => {
    const onNote = vi.fn();
    const container = mount(NoteSection, { onNote });
    openNote(container);
    await Vue.nextTick();

    await writeNote(container, 'Leave at the gate');
    await writeNote(container, 'Leave at the gate');
    await writeNote(container, 'Ring twice');

    expect(onNote.mock.calls).toEqual([['Leave at the gate'], ['Ring twice']]);
  });

  it('keeps the last emitted note per instance', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const one = mount(NoteSection, { onNote: first });
    const two = mount(NoteSection, { onNote: second });
    for (const container of [one, two]) openNote(container);
    await Vue.nextTick();

    await writeNote(one, 'Same note');
    await writeNote(two, 'Same note');

    expect(first).toHaveBeenCalledExactlyOnceWith('Same note');
    expect(second).toHaveBeenCalledExactlyOnceWith('Same note');
  });
});

describe('client dashboard tab requests', () => {
  it('View Orders asks the page for the Orders tab', () => {
    const onOpenTab = vi.fn();
    const container = mount(RecentlyBought, { data: [], 'onOpen-tab': onOpenTab });
    button(container, 'View Orders').click();
    expect(onOpenTab).toHaveBeenCalledExactlyOnceWith({ label: 'Orders', value: 'orders' });
  });

  it('Transactions asks the page for the Transaction History tab', () => {
    const onOpenTab = vi.fn();
    const card = { type: 'card', card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 } };
    const container = mount(PaymentCard, { card, 'onOpen-tab': onOpenTab });
    button(container, 'Transactions').click();
    expect(onOpenTab).toHaveBeenCalledExactlyOnceWith({ label: 'Transaction History', value: 'transaction_history' });
    expect(activeOrderFilter.value).toEqual({ value: 'home' });
  });
});
