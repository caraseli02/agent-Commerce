// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';
import * as Vue from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

// #637: the control-panel Settings "Send Password Reset" button must fire one reset per click
// and must not submit the surrounding form.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const settingsPath = resolve(repoRoot, 'app/components/dashboard/control-panel/settings-view/Settings.vue');

const settingsRender = () => {
  const { descriptor } = parse(readFileSync(settingsPath, 'utf8'));
  const { code } = compile(descriptor.template!.content, { mode: 'function' });

  return new Function('Vue', code)(Vue) as Vue.RenderFunction;
};

const mountSettings = (resetPassword: (email: string) => void) => {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const app = Vue.createApp({
    render: settingsRender(),
    components: {
      FormInput: { props: ['modelValue'], render: () => Vue.h('input') },
      SecurityUserIcon: { render: () => Vue.h('svg') },
      CheckIcon: { render: () => Vue.h('svg') },
    },
    setup: () => ({
      alertsAndNotifications: Vue.ref([]),
      marketingPreferences: Vue.ref([]),
      securityEmail: Vue.ref('customer@demo.com'),
      markSettingAsRead: () => undefined,
      resetPassword,
    }),
  });
  app.mount(host);

  return { app, host };
};

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
