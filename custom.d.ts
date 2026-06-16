declare module '*.svg' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent;
  export default component;
}

declare module 'swiper' {
  const Swiper: unknown;
  export default Swiper;
  export const Navigation: unknown;
  export const Pagination: unknown;
  export const Autoplay: unknown;
  export const EffectFade: unknown;
  export const Thumbs: unknown;
  export const A11y: unknown;
  export const Zoom: unknown;
}

declare module 'tiny-emitter/instance' {
  import type TinyEmitter from 'tiny-emitter';

  const emitter: TinyEmitter;
  export default emitter;
}

declare module 'tiny-emitter/instance.js' {
  import type TinyEmitter from 'tiny-emitter';

  const emitter: TinyEmitter;
  export default emitter;
}

declare module 'vuejs-paginate-next' {
  import type { DefineComponent } from 'vue';

  const Paginate: DefineComponent<Record<string, unknown>>;
  export default Paginate;
}
