// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Vue from 'vue';
import { renderToString } from '@vue/server-renderer';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import { OrderType, PaymentTypeEnum } from '../types';
import { isBuyerCheckoutPaymentType, unavailablePaymentMethodMessage } from '../helpers/checkout-payment-methods';

const Icon = Vue.defineComponent({ setup: () => () => Vue.h('svg', { 'aria-hidden': 'true' }) });
const Button = Vue.defineComponent({
  inheritAttrs: false,
  setup:
    (_props, { attrs, slots }) =>
    () =>
      Vue.h('button', attrs, slots.default?.()),
});
const toggle = vi.fn();
const push = vi.fn();
const store = { showCardsModal: false, toggleCardModal: toggle };
const savedCard = { id: 'card-test', default: false, card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 } };
const selectedCard = Vue.ref<typeof savedCard | null>(null);
const settings = Vue.ref({ orderSettings: { paymentMethods: [0, 1, 2, 3].map((type) => ({ type })) } });
const newCardSelected = Vue.ref(true);
const mockMode = Vue.ref(false);
const auth = { getGeneralSettings: settings, generalSettings: settings, token: Vue.ref('demo') };
const modules: Record<string, unknown> = {
  vue: Vue,
  '@lucide/vue': { AlertTriangle: Icon, CheckCircle2: Icon, Trash2Icon: Icon },
  '#app': { useRouter: () => ({ push }), useRuntimeConfig: () => ({ public: { MOCK_MODE: mockMode.value } }) },
  pinia: { storeToRefs: (value: unknown) => (value === store ? { showCardsModal: Vue.ref(store.showCardsModal) } : value) },
  '~/store/paymentStore': { usePaymentStore: () => store },
  '~/store/authStore': { useAuthStore: () => auth },
  '~/composables/useUser': { useUser: () => ({ user: Vue.ref({ firebaseId: 'customer' }) }) },
  '~/composables/useGuestCheckout': { useGuestCheckout: () => ({ guestCheckoutMode: Vue.ref(false) }) },
  '~/composables/usePaymentCards': {
    usePaymentCards: () => ({ card: selectedCard, cards: Vue.ref([savedCard]), isNewCardSelected: newCardSelected }),
  },
  '~~/helpers/mock-integration': { isPaymentManagementVisible: (mock: boolean) => !mock },
  '~~/helpers/address.helper': { isCompleteSavedAddress: () => true },
  '~~/helpers/checkout-credit': { resolveCreditUnavailableReason: () => null },
  '~~/helpers/checkout-payment-methods': { isBuyerCheckoutPaymentType, unavailablePaymentMethodMessage },
  '~~/types': { PaymentTypeEnum, OrderType },
  'tiny-emitter/instance.js': { default: { emit: vi.fn() } },
};

// Compile the real SFC script and template. Only Nuxt services, icons and the
// primitive's native rendering seam are substituted, so slot placement and
// event propagation are exercised rather than reproduced in a test component.
const load = (name: string) => {
  const source = readFileSync(resolve(process.cwd(), 'app/components/order-summary', name + '.vue'), 'utf8');
  const { descriptor } = parse(source);
  const compiled = compileScript(descriptor, { id: `c2-${name}`, inlineTemplate: true });
  const { outputText } = ts.transpileModule(compiled.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exported: { default?: Vue.Component } = {};
  const requireDependency = (id: string) => {
    if (id.endsWith('.svg') || id.endsWith('DemoTooltip.vue')) return { default: Icon };
    if (!(id in modules)) throw new Error(`Unconfigured component dependency: ${id}`);
    return modules[id];
  };
  new Function('require', 'exports', outputText)(requireDependency, exported);
  return { component: exported.default!, icons: [...source.matchAll(/<(Svgo\w+)/g)].map((match) => match[1]) };
};
const NewCard = load('NewCard');
const PayByCard = load('PayByCard');
const PaymentMethod = load('PaymentMethodSection');
const OrderStockType = load('OrderStockType');
const apps: Vue.App[] = [];
const configure = (app: Vue.App, icons: string[]) => {
  app.component('UiButton', Button);
  for (const name of new Set(icons)) app.component(name, Icon);
  app.component('OrderSummaryNewCard', NewCard.component);
  app.component('OrderSummaryPayByCard', PayByCard.component);
  app.component('OrderSummaryCreditInfoModal', { render: () => Vue.h('div', 'Credit details') });
  app.component('OrderSummaryShippingAndBillingSection', { render: () => Vue.h('div', 'Address choices') });
  app.component('OrderSummaryShippingPreferencesSection', { render: () => Vue.h('div', 'Shipping choices') });
  app.component('OrderSummaryPaymentMethodSection', { render: () => Vue.h('div', 'Payment choices') });
  app.component('AppModal', { render: () => null });
  app.component('OrderSummaryPaymentModal', { render: () => null });
  app.directive('click-outside', {});
};
const mount = (surface: ReturnType<typeof load>, props: Record<string, unknown>, slots?: Record<string, () => Vue.VNode>) => {
  const container = document.createElement('div');
  document.body.append(container);
  const app = Vue.createApp({ render: () => Vue.h(surface.component, props, slots) });
  configure(app, [...NewCard.icons, ...PayByCard.icons, ...surface.icons]);
  apps.push(app);
  app.mount(container);
  return container;
};
const button = (container: HTMLElement, text: string) => {
  const match = [...container.querySelectorAll('button')].find((element) => element.textContent?.includes(text));
  expect(match, `Missing button: ${text}`).toBeDefined();
  return match!;
};
const assertValidButtons = (html: string) => {
  let depth = 0;
  for (const tag of html.match(/<\/?button\b[^>]*>/g) ?? []) {
    if (tag.startsWith('</')) depth -= 1;
    else {
      expect(depth, 'SSR must never put an action inside a selection button').toBe(0);
      depth += 1;
    }
  }
  expect(depth).toBe(0);
};
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  settings.value = { orderSettings: { paymentMethods: [0, 1, 2, 3].map((type) => ({ type })) } };
  newCardSelected.value = true;
  selectedCard.value = null;
  mockMode.value = false;
  vi.clearAllMocks();
});

describe('C2 structural controls', () => {
  it('keeps a new-card slot action independent of selection and legacy click consumers', () => {
    const selected = vi.fn();
    const clicked = vi.fn();
    const changed = vi.fn();
    const container = mount(
      NewCard,
      { onSelectPaymentOption: selected, onClick: clicked },
      { default: () => Vue.h(Button, { onClick: changed }, () => 'Change') },
    );
    button(container, 'Change').click();
    expect(changed).toHaveBeenCalledOnce();
    expect(selected).not.toHaveBeenCalled();
    expect(clicked).not.toHaveBeenCalled();
    button(container, 'Pay with a new card').click();
    expect(selected).toHaveBeenCalledOnce();
    expect(clicked).toHaveBeenCalledOnce();
    expect(container.querySelector('button button')).toBeNull();
  });

  it('Change opens card management without changing the payment selection', () => {
    const updated = vi.fn();
    const container = mount(PaymentMethod, {
      order: { paymentDetails: { type: PaymentTypeEnum.Bank }, total: 10 },
      accountCredit: { available: 100 },
      'onUpdate-payment-details': updated,
    });
    button(container, 'Change').click();
    expect(toggle).toHaveBeenCalledOnce();
    expect(updated).not.toHaveBeenCalled();
    button(container, 'Pay with a new card').click();
    expect(updated).toHaveBeenCalledExactlyOnceWith({ type: PaymentTypeEnum.Card, card: null });
    expect(container.querySelector('button button')).toBeNull();
  });

  it('keeps non-card choices visible and disabled regardless of settings or credit balance', () => {
    settings.value = { orderSettings: { paymentMethods: [] } };
    const updated = vi.fn();
    const container = mount(PaymentMethod, {
      order: { paymentDetails: { type: PaymentTypeEnum.Bank }, total: 10 },
      accountCredit: { available: 1000 },
      'onUpdate-payment-details': updated,
    });

    for (const label of ['Bank Transfer', 'Pay from credit', 'Cash on delivery']) {
      const choice = button(container, label);
      expect(choice.disabled).toBe(true);
      expect(choice.getAttribute('aria-label')).toContain(unavailablePaymentMethodMessage);
      expect(choice.getAttribute('variant')).toBe('option');
      choice.click();
    }
    expect(container.textContent).toContain(unavailablePaymentMethodMessage);
    expect(updated).not.toHaveBeenCalled();

    button(container, 'Pay with a new card').click();
    expect(updated).toHaveBeenCalledExactlyOnceWith({ type: PaymentTypeEnum.Card, card: null });
  });

  it('keeps new-card selection available with a saved card when management is hidden', () => {
    selectedCard.value = savedCard;
    newCardSelected.value = false;
    mockMode.value = true;
    const updated = vi.fn();
    const container = mount(PaymentMethod, {
      order: { paymentDetails: { type: PaymentTypeEnum.Card, card: savedCard }, total: 10 },
      accountCredit: { available: 100 },
      'onUpdate-payment-details': updated,
    });

    expect(container.textContent).toContain('4242');
    expect(container.querySelector('[data-testid="payment-management"]')).toBeNull();
    button(container, 'Pay with a new card').click();
    expect(updated).toHaveBeenCalledExactlyOnceWith({ type: PaymentTypeEnum.Card, card: null });
  });

  it('saved-card actions preserve their payloads without selecting the card', () => {
    const selected = vi.fn();
    const clicked = vi.fn();
    const deleted = vi.fn();
    const defaulted = vi.fn();
    const edited = vi.fn();
    const container = mount(PayByCard, {
      view: 'modal',
      hasCard: true,
      cardInfo: savedCard,
      enableEdit: true,
      onSelectPaymentOption: selected,
      onClick: clicked,
      'onDelete-card': deleted,
      'onSet-default': defaulted,
      'onEdit-card': edited,
    });
    button(container, 'Set as default').click();
    button(container, 'Edit').click();
    button(container, 'Delete').click();
    expect(defaulted).toHaveBeenCalledExactlyOnceWith(savedCard);
    expect(edited).toHaveBeenCalledExactlyOnceWith(savedCard);
    expect(deleted).toHaveBeenCalledExactlyOnceWith(savedCard);
    expect(selected).not.toHaveBeenCalled();
    expect(clicked).not.toHaveBeenCalled();
    button(container, '4242').click();
    expect(selected).toHaveBeenCalledExactlyOnceWith(savedCard);
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('checkout Edit opens management without selecting or navigating the card', () => {
    const selected = vi.fn();
    const clicked = vi.fn();
    const container = mount(PayByCard, {
      view: 'payment',
      hasCard: true,
      cardInfo: savedCard,
      enableEdit: true,
      showPayWithLabel: true,
      onSelectPaymentOption: selected,
      onClick: clicked,
    });
    button(container, 'Edit').click();
    expect(toggle).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(selected).not.toHaveBeenCalled();
    expect(clicked).not.toHaveBeenCalled();
  });

  it('credit information does not select credit', async () => {
    newCardSelected.value = false;
    const updated = vi.fn();
    const container = mount(PaymentMethod, {
      order: { paymentDetails: { type: PaymentTypeEnum.Bank }, total: 10 },
      accountCredit: { available: 100 },
      'onUpdate-payment-details': updated,
    });
    button(container, '100.00').click();
    await Vue.nextTick();
    expect(container.textContent).toContain('Credit details');
    expect(updated).not.toHaveBeenCalled();
    newCardSelected.value = true;
  });

  it('invalid shipping and payment guards stay open and valid sections can collapse', async () => {
    const order = Vue.reactive({
      type: OrderType.Mixed,
      paymentDetails: {},
      deliveryMethod: null as object | null,
      backorderOption: null as object | null,
      shippingDetails: {},
    });
    const container = mount(OrderStockType, {
      order,
      items: [{ stock: 1, backorder_stock: 1, productEntity: { stock: 10 } }],
      accountCredit: {},
      shippingPreferences: null,
    });
    await Vue.nextTick();
    button(container, 'Shipping Preferences').click();
    button(container, 'Payment Method').click();
    await Vue.nextTick();
    expect(container.textContent).toContain('Shipping choices');
    expect(container.textContent).toContain('Payment choices');
    order.deliveryMethod = { service: {} };
    order.backorderOption = { _id: 'back-1' };
    order.paymentDetails = { type: PaymentTypeEnum.Bank };
    await Vue.nextTick();
    button(container, 'Shipping Preferences').click();
    button(container, 'Payment Method').click();
    await Vue.nextTick();
    await vi.waitFor(() => {
      expect(container.textContent).not.toContain('Shipping choices');
      expect(container.textContent).not.toContain('Payment choices');
    });
  });

  it('renders valid SSR buttons for card actions, slotted Change, and credit information', async () => {
    for (const [surface, props, slots] of [
      [NewCard, {}, { default: () => Vue.h(Button, {}, () => 'Change') }],
      [PayByCard, { view: 'modal', hasCard: true, cardInfo: savedCard, enableEdit: true }],
      [PaymentMethod, { order: { paymentDetails: { type: PaymentTypeEnum.Bank }, total: 10 }, accountCredit: { available: 100 } }],
    ] as const) {
      const app = Vue.createSSRApp({ render: () => Vue.h(surface.component, props, slots) });
      configure(app, [...NewCard.icons, ...PayByCard.icons, ...surface.icons]);
      assertValidButtons(await renderToString(app));
    }
  });
});
