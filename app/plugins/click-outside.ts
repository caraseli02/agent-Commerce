import { v4 as uuidv4 } from 'uuid';

type ClickOutsideHandler = {
  callback: (event: MouseEvent) => void;
};

const handlers: Record<string, ClickOutsideHandler> = {};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('click-outside', {
    mounted(el, binding) {
      const id = uuidv4();
      el.setAttribute('dir-id', id);

      let latch = false;

      handlers[id] = {
        callback: (event: MouseEvent) => {
          if (latch) {
            const clickedEl = event.target as Node | null;
            if (!clickedEl) {
              return;
            }
            // The click may have unmounted its own target (e.g. a button hidden by its handler), so
            // `contains` alone misses it; the event path is fixed at dispatch and still includes `el`.
            if (!el.contains(clickedEl) && !event.composedPath().includes(el)) {
              binding.value();
            }
          } else {
            latch = true;
          }
        },
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('click', handlers[id]!.callback);
      }
    },
    beforeUnmount(el) {
      const id = el.getAttribute('dir-id');
      if (id && typeof document !== 'undefined') {
        const handler = handlers[id];
        if (handler) document.removeEventListener('click', handler.callback);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete handlers[id];
      }
    },
  });
});
