import dotenv from 'dotenv';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const _ = require('lodash');

const svgPrefix = {};
svgPrefix.toString = () => `${_.uniqueId()}_`;

dotenv.config({ path: '.env' });
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        'nuxt-svgo',
        'nuxt-swiper',
        '@pinia/nuxt',
        'pinia-plugin-persistedstate/nuxt',
        'nuxt-lodash',
        'nuxt-viewport',
        '@vueuse/nuxt',
        '@formkit/auto-animate/nuxt',
        '@nuxtjs/leaflet',
        'shadcn-nuxt',
        '@nuxtjs/color-mode',
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
    app: {
        head: {
            titleTemplate: '%s - Demo',
            link: [
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                {
                    rel: 'preconnect',
                    href: 'https://fonts.gstatic.com',
                    crossorigin: 'anonymous',
                },
                {
                    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap',
                    rel: 'stylesheet',
                },
            ],
            meta: [
                {
                    name: 'viewport',
                    content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
                },
            ],
            script: [
                {
                    src: 'https://cdn.jsdelivr.net/npm/tw-elements/dist/js/tw-elements.min.es.js',
                },
            ],
        },
    },

    css: [
        '~/assets/css/main.css',
        '~/assets/css/resets.css',
        '~/assets/css/utils.css',
        '~/assets/css/animations.css',
        '~/assets/css/vendors/leaflet.css',
        '~/assets/css/vendors/v-calendar.css',
    ],

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

    ignore: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**', '**/dist/**', '**/coverage/**', '**/.output/**'],

    routeRules: {
        '/dashboard/**': { appMiddleware: ['auth'] },
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
        vue: {
            script: {
                defineModel: true,
            },
        },
        server: {
            watch: {
                usePolling: true,
                interval: 1000,
            },
        },
    },

    postcss: {
        plugins: {
            tailwindcss: {},
            autoprefixer: {},
        },
    },

    hooks: {
        'builder:watch': () => {},
    },

    eslint: {
        checker: false,
        config: {
            stylistic: {
                semi: true,
            },
        },
    },

    lodash: {
        prefix: '_',
        prefixSkip: ['string'],
        upperAfterPrefix: false,
        exclude: ['map'],
        alias: [
            ['camelCase', 'stringToCamelCase'], // => stringToCamelCase
            ['kebabCase', 'stringToKebab'], // => stringToKebab
            ['isDate', 'isLodashDate'], // => _isLodashDate
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
