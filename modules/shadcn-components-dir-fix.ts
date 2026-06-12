import { defineNuxtModule } from '@nuxt/kit';
import type { ComponentsDir } from 'nuxt/schema';

const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/\/+$/, '');

const isComponentsDir = (dir: string | ComponentsDir): dir is ComponentsDir => typeof dir !== 'string';

export default defineNuxtModule({
    meta: {
        name: 'demo-shadcn-components-dir-fix',
    },
    setup(_, nuxt) {
        nuxt.hook('components:dirs', (dirs) => {
            const filtered = dirs.filter((dir) => {
                if (!isComponentsDir(dir) || !dir.path) {
                    return true;
                }

                const path = normalizePath(String(dir.path));

                // `shadcn-nuxt` injects `components/ui` into auto-components with `extensions: []`,
                // which causes Nuxt to scan `index.ts` as a component file and collide with `*.vue`.
                // We rely on `shadcn-nuxt`'s explicit `addComponent()` registrations (with `prefix: 'Ui'`),
                // so we can safely skip auto-scanning this directory.
                const isShadcnUiDir = path.endsWith('/components/ui');
                const scansEverything = Array.isArray(dir.extensions) && dir.extensions.length === 0;

                return !(isShadcnUiDir && scansEverything);
            });

            dirs.splice(0, dirs.length, ...filtered);
        });
    },
});
