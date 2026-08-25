# Nuxt 4 migration revalidation — final outcomes

Date: 2026-08-25

This report records the follow-up to the audit of `c7e36ae0`. It intentionally
keeps the root-level layout required by closed issue #461 and does not opt into
Nuxt 5 compatibility mode.

## Resolved findings

| Finding                                                            | Outcome                                                                                                                                    | Evidence                                                                                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Async-data handler returned `null` during similar-product transfer | Resolved in source with `enabled: computed(() => !showSimilarOnly.value)` and an explicit refresh after transferred filters clear the gate | `pnpm exec vitest run tests/search-useAsyncData.spec.ts` (5 passing tests)                                                                             |
| README identified Nuxt 3                                           | Resolved                                                                                                                                   | `README.md` now consistently says Nuxt 4                                                                                                               |
| Migration plan presented completed work as future work             | Resolved                                                                                                                                   | `docs/MIGRATION_PLAN.md` records completed Nuxt, Tailwind, Pinia, VueUse, chart, date-fns, formatting, and lint migrations; resolved peers are removed |
| Missing epic #457 source record                                    | Resolved                                                                                                                                   | Restored `2026-08-09-nuxt-4-upgrade-evaluation.md` with official Nuxt citations                                                                        |
| `future.compatibilityVersion: 4`                                   | Removed as redundant; no value of 5 was added                                                                                              | `nuxt.config.ts`                                                                                                                                       |
| Node support declaration absent                                    | Resolved                                                                                                                                   | `package.json` declares `node >=24 <25`, matching CI Node 24                                                                                           |
| Nuxt 3/4 precomputed manifest path fallback                        | Resolved narrowly                                                                                                                          | The bundle guard uses the Nuxt 4 manifest path only, in a shared helper                                                                                |

## Runtime evidence

- Frozen local install: `pnpm install --frozen-lockfile --ignore-workspace` passed with pnpm 10.18.3.
- Production build: `pnpm build` passed on Nuxt 4.5.2.
- Search route: `GET /search?keyword=capacitor` returned HTTP 200 from the local production server.
- Chromium browser check passes: selecting Core, opening “Show similar products,” and rendering search results at `/search?similar=true`.

## TypeScript project-reference revalidation

The root `tsconfig.json` now follows Nuxt 4's four generated project references,
and the temporary `typescript.strict: false` / `noImplicitThis: false` controls
were removed. This deliberately exposes genuine strictness violations that were
previously hidden. All 225 reported violations were resolved with local guards,
fixture invariants, and accurate types—no replacement global compiler suppression
was introduced. `pnpm typecheck` and `pnpm verify:full` pass; the latter covers
the Nuxt 4.5.2 build, lint, 290 tests, feature-list validation, architecture
checks, and production preview smoke.

## Official sources

- [Nuxt 4 upgrade guide](https://nuxt.com/docs/4.x/getting-started/upgrade)
- [Nuxt TypeScript project references](https://nuxt.com/docs/4.x/guide/concepts/typescript#project-references)
- [Nuxt `useAsyncData` API](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Nuxt installation prerequisites](https://nuxt.com/docs/4.x/getting-started/installation#prerequisites)
