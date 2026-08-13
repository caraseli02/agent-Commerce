// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  future: {
    compatibilityVersion: 4,
  },

  // Preserve root-level source layout until #461 moves to the Nuxt 4 app directory.
  srcDir: '.',

  // Nuxt 4 compatibility mode tightens Vue SFC inference; relax until #465.
  typescript: {
    strict: false,
    tsConfig: {
      compilerOptions: {
        // Keep the existing relaxed Options API baseline while Nuxt 4's
        // generated type projects are adopted incrementally.
        noImplicitThis: false,
      },
    },
  },

  modules: [
    '@nuxt/fonts',
    'nuxt-svgo',
    'nuxt-swiper',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-viewport',
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/image',
    '@nuxt/eslint',
    '~/modules/shadcn-components-dir-fix',
  ],

  components: {
    dirs: [
      {
        path: '~/components/global',
        extensions: ['vue'],
      },
      {
        path: '~/components/ui',
        extensions: ['vue'],
      },
      {
        path: '~/components',
        extensions: ['vue'],
        ignore: ['global/**', 'ui/**', '**/*.ts'],
      },
    ],
  },
  fonts: {
    families: [
      { name: 'Archivo', provider: 'google', weights: [500, 600, 700] },
      { name: 'Source Sans 3', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      titleTemplate: '%s | Components Marketplace',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],
    },
  },

  css: ['~/assets/css/resets.css', '~/assets/css/utils.css', '~/assets/css/animations.css', '~/assets/css/vendors/v-calendar.css'],

  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectID: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessageSenderID: process.env.NUXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
      firebaseAppID: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementID: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      BASE_URL_API: process.env.NUXT_PUBLIC_BASE_URL_API ?? '/api',
      MOCK_MODE: process.env.NUXT_PUBLIC_MOCK_MODE === 'true',
      HOST: '0.0.0.0',
    },
  },

  image: {
    format: ['avif', 'webp'],
    screens: {
      xs: 390,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
  },

  ignore: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**', '**/dist/**', '**/coverage/**', '**/.output/**'],

  routeRules: {
    '/dashboard/**': { appMiddleware: ['auth'], ssr: false },
    '/checkout/**': { appMiddleware: ['auth'] },
    '/product/categories': { appMiddleware: ['auth'] },
  },
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  experimental: {
    appManifest: false,
  },

  compatibilityDate: '2024-11-20',

  vite: {
    server: {
      watch: {
        usePolling: false,
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }

            if (id.includes('swiper')) {
              return 'vendor-swiper';
            }

            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }

            return undefined;
          },
        },
      },
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  eslint: {
    checker: false,
    config: {
      stylistic: false,
    },
  },

  imports: {
    // `nuxt-lodash` only supports Nuxt 3. Keep the two existing auto-imports
    // on Nuxt 4 without coupling the app to an incompatible Nuxt module.
    presets: [
      {
        from: 'lodash-es',
        imports: [
          { name: 'cloneDeep', as: '_cloneDeep' },
          { name: 'debounce', as: '_debounce' },
          { name: 'isEqual', as: '_isEqual' },
        ],
      },
    ],
  },

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: 'Ui',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui',
  },

  svgo: {
    svgo: true,
    defaultImport: 'component',
    svgoConfig: {
      multipass: true,
    },
  },

  viewport: {
    breakpoints: {
      xs: 390,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
  },
});
