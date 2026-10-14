// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';
import * as Vue from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

// #637: the control-panel Settings "Send Password Reset" button must fire one reset per click
// and must not submit the surrounding form. #643 (M6): the Settings and client AlertsItem checkboxes
// are UiCheckbox; neither view has a rendering route, so their wiring is checked here.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const settingsPath = resolve(repoRoot, 'app/components/dashboard/control-panel/settings-view/Settings.vue');
const alertsItemPath = resolve(repoRoot, 'app/components/dashboard/client/settings/AlertsItem.vue');

const templateRender = (path: string) => {
  const { descriptor } = parse(readFileSync(path, 'utf8'));
  const { code } = compile(descriptor.template!.content, { mode: 'function' });

  return new Function('Vue', code)(Vue) as Vue.RenderFunction;
};

/** Native stand-ins with the primitives' contracts: UiButton passes attrs to a button; UiCheckbox is a role=checkbox button. */
const primitiveStubs = {
  UiButton: {
    render(this: { $slots: Vue.Slots }) {
      return Vue.h('button', this.$slots.default?.());
    },
  },
  UiCheckbox: Vue.defineComponent({
    props: { checked: Boolean },
    emits: ['update:checked'],
    setup:
      (props, { emit }) =>
      () =>
        Vue.h('button', {
          type: 'button',
          role: 'checkbox',
          'aria-checked': String(props.checked),
          onClick: () => emit('update:checked', !props.checked),
        }),
  }),
};

const mountTemplate = (path: string, setup: () => Record<string, unknown>) => {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const app = Vue.createApp({
    render: templateRender(path),
    components: {
      ...primitiveStubs,
      FormInput: { props: ['modelValue'], render: () => Vue.h('input') },
      SecurityUserIcon: { render: () => Vue.h('svg') },
    },
    setup,
  });
  app.mount(host);

  return { app, host };
};

const mountSettings = (
  resetPassword: (email: string) => void,
  markSettingAsRead: (item: unknown, type: string) => void = () => undefined,
  alertsAndNotifications: Array<Record<string, unknown>> = [],
  marketingPreferences: Array<Record<string, unknown>> = [],
) =>
  mountTemplate(settingsPath, () => ({
    alertsAndNotifications: Vue.ref(alertsAndNotifications),
    marketingPreferences: Vue.ref(marketingPreferences),
    securityEmail: Vue.ref('customer@demo.com'),
    markSettingAsRead,
    resetPassword,
  }));

describe('control-panel Settings password reset', () => {
  let mounted: ReturnType<typeof mountSettings> | undefined;

  afterEach(() => {
    mounted?.app.unmount();
    mounted?.host.remove();
    mounted = undefined;
  });

  it('calls resetPassword once per click without submitting the form', () => {
    const resetPassword = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    mounted = mountSettings(resetPassword);

    const form = mounted.host.querySelector('form')!;
    form.addEventListener('submit', submit);
    const button = [...form.querySelectorAll('button')].find((el) => el.textContent?.includes('Send Password Reset'));

    button!.click();

    expect(resetPassword).toHaveBeenCalledTimes(1);
    expect(resetPassword).toHaveBeenCalledWith('customer@demo.com');
    expect(button!.getAttribute('type')).toBe('button');
    expect(submit).not.toHaveBeenCalled();
  });
});

describe('control-panel Settings checkboxes', () => {
  let mounted: ReturnType<typeof mountSettings> | undefined;

  afterEach(() => {
    mounted?.app.unmount();
    mounted?.host.remove();
    mounted = undefined;
  });

  it('reflects each stored setting and saves the toggled value', async () => {
    const saved: Array<{ key: string; type: string; value: unknown }> = [];
    const markSettingAsRead = (item: unknown, type: string) => {
      const setting = item as Record<string, unknown>;
      saved.push({ key: String(setting.key), type, value: setting[type] });
    };
    mounted = mountSettings(
      vi.fn(),
      markSettingAsRead,
      [{ label: 'New Products', key: 'newProducts', email: true, app: false }],
      [{ label: 'Newsletter', key: 'newsletter', email: false, app: false }],
    );

    const boxes = [...mounted.host.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')];
    expect(boxes.map((box) => box.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);

    boxes[0]!.click();
    boxes[1]!.click();
    boxes[2]!.click();
    await Vue.nextTick();

    expect(saved).toEqual([
      { key: 'newProducts', type: 'email', value: false },
      { key: 'newProducts', type: 'app', value: true },
      { key: 'newsletter', type: 'email', value: true },
    ]);
    expect(boxes.map((box) => box.getAttribute('aria-checked'))).toEqual(['false', 'true', 'true']);
  });
});

describe('client AlertsItem checkboxes', () => {
  it('updates both models and saves each toggle', async () => {
    const handleChange = vi.fn();
    const emailModel = Vue.ref(false);
    const appModel = Vue.ref(true);
    const mounted = mountTemplate(alertsItemPath, () => ({
      title: 'HOT Deals',
      props: { title: 'HOT Deals' },
      emailModel,
      appModel,
      handleChange,
    }));

    const [email, app] = [...mounted.host.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')];
    email!.click();
    app!.click();
    await Vue.nextTick();

    expect(emailModel.value).toBe(true);
    expect(appModel.value).toBe(false);
    expect(handleChange.mock.calls).toEqual([
      ['HOT Deals', 'email', true],
      ['HOT Deals', 'app', false],
    ]);

    mounted.app.unmount();
    mounted.host.remove();
  });
});
