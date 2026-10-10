import VueTouch from '@vuemod/vue-touch';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueTouch);
});
