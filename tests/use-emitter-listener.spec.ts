// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Emitter from 'tiny-emitter/instance.js';
import { createApp, createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { describe, expect, it, vi } from 'vitest';
import { useEmitterListener } from '~/composables/useEmitterListener';

const listeningComponent = (event: string, handler: (payload: unknown) => void) =>
  defineComponent({
    setup() {
      useEmitterListener(event, handler);
      return () => h('div');
    },
  });

describe('useEmitterListener', () => {
  it('listens while mounted and stops after unmount', () => {
    const handler = vi.fn();
    const app = createApp(listeningComponent('test-mounted', handler));
    app.mount(document.createElement('div'));

    Emitter.emit('test-mounted', 'first');
    expect(handler).toHaveBeenCalledWith('first');

    app.unmount();
    Emitter.emit('test-mounted', 'second');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not stack listeners across remounts', () => {
    const handler = vi.fn();
    for (let visit = 0; visit < 3; visit++) {
      const app = createApp(listeningComponent('test-remount', handler));
      app.mount(document.createElement('div'));
      app.unmount();
    }
    const app = createApp(listeningComponent('test-remount', handler));
    app.mount(document.createElement('div'));

    Emitter.emit('test-remount');
    expect(handler).toHaveBeenCalledTimes(1);
    app.unmount();
  });

  it('registers nothing during a server render', async () => {
    const handler = vi.fn();
    await renderToString(createSSRApp(listeningComponent('test-ssr', handler)));

    Emitter.emit('test-ssr');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('/search event-bus listeners', () => {
  it.each(['app/pages/search.vue', 'app/components/search/Filters.vue'])('%s subscribes only through useEmitterListener', (path) => {
    const source = readFileSync(resolve(path), 'utf8');
    expect(source).not.toMatch(/Emitter\.on\(/);
    expect(source).toMatch(/useEmitterListener\(/);
  });
});
