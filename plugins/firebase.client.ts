import { initializeApp } from '@firebase/app';
import { getAuth, type Auth } from '@firebase/auth';

declare module '#app' {
  interface NuxtApp {
    $auth: Auth;
  }
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig();
  let auth: Auth | null = null;

  const getAuthInstance = (): Auth => {
    if (!auth) {
      const app = initializeApp({
        apiKey: (config.public.firebaseApiKey as string) || 'test',
        authDomain: (config.public.firebaseAuthDomain as string) || 'test',
        projectId: (config.public.firebaseProjectID as string) || 'test',
        storageBucket: (config.public.firebaseStorageBucket as string) || 'test',
        messagingSenderId: (config.public.firebaseMessageSenderID as string) || 'test',
        appId: (config.public.firebaseAppID as string) || 'test',
        measurementId: (config.public.firebaseMeasurementID as string) || 'test',
      });

      auth = getAuth(app);
    }

    return auth as Auth;
  };

  const authProxy = new Proxy({} as Auth, {
    get(_target, prop, receiver) {
      const instance = getAuthInstance();
      const value = Reflect.get(instance, prop, receiver);

      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });

  nuxtApp.vueApp.provide('auth', authProxy);
  nuxtApp.provide('auth', authProxy);
});
