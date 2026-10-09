import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { withPrivateRobotsHeaders } from './helpers/seo-routes';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  hooks: {
    'nitro:config'(config) {
      // Prepend after Nuxt installs its handler; nonprivate/page errors fall
      // through to the original Nuxt handler and Nitro's normal fallback.
      const existing = config.errorHandler ? [config.errorHandler].flat() : [];
      config.errorHandler = [fileURLToPath(new URL('./server/api-cache-error.ts', import.meta.url)), ...existing];
    },
  },

  // #461 intentionally preserves the root-level source layout.
  srcDir: '.',

  modules: [
    '@nuxt/fonts',
    'nuxt-svgo',
    'nuxt-swiper',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-viewport',
    '@vueuse/nuxt',
    'shadcn-nuxt',
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
        path: '~/components/global',
        prefix: 'global',
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
      // Google Fonts retired one Archivo subset URL; resolving it at build time
      // makes otherwise deterministic production builds fail. Keep the existing
      // display stack, which falls back to Source Sans 3 when Archivo is absent.
      { name: 'Archivo', provider: 'none' },
      { name: 'Source Sans 3', provider: 'google', weights: [400, 500, 600, 700] },
    ],
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
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
        },
        {
          rel: 'apple-touch-icon',
          href: '/favicon.svg',
        },
      ],
    },
  },

  // This is the only emitting Tailwind entry. Files that use `@apply` reference
  // it so their separately bundled SFC styles share the same theme context.
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      BASE_URL_API: process.env.NUXT_PUBLIC_BASE_URL_API ?? '/api',
      MOCK_MODE: process.env.NUXT_PUBLIC_MOCK_MODE === 'true',
      // Canonical origin for SEO URLs; empty falls back to the request origin.
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? '',
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

  // Private routes also send `X-Robots-Tag`; client-only dashboard HTML has no server-rendered robots meta.
  routeRules: withPrivateRobotsHeaders({
    '/dashboard/**': { appMiddleware: ['auth'], ssr: false },
    '/product/categories': { appMiddleware: ['auth'] },
  }),
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  experimental: {
    appManifest: false,
  },

  compatibilityDate: '2024-11-20',

  vite: {
    plugins: [tailwindcss()],
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
    dts: true,
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
    // Match the Tailwind breakpoint names during SSR; otherwise Nuxt 4
    // hydrates an empty viewport-dependent product grid before the client
    // replaces it with its detected breakpoint.
    defaultBreakpoints: {
      desktop: 'lg',
      mobile: 'xs',
      tablet: 'md',
    },
    fallbackBreakpoint: 'lg',
  },
});
