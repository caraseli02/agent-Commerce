# Nuxt 4 upgrade evaluation

Date: 2026-08-09 (restored 2026-08-25)

## Decision

Upgrade the portfolio demo from Nuxt 3 to Nuxt 4 while retaining the root-level
application layout. Nuxt's upgrade guide explicitly supports retaining the old
layout; #461 made that an acceptance criterion, so moving application files to
`app/` is not part of this migration.

## Compatibility baseline

- Nuxt: 4.5.2
- Node: 24.x in CI and `>=24 <25` in package metadata
- pnpm: 10.18.3
- Source layout: root-level application files with `srcDir: '.'`

## Official sources consulted

- [Nuxt 4 upgrade guide](https://nuxt.com/docs/4.x/getting-started/upgrade)
- [Nuxt TypeScript project references](https://nuxt.com/docs/4.x/guide/concepts/typescript#project-references)
- [Nuxt TypeScript configuration](https://nuxt.com/docs/4.x/directory-structure/tsconfig)
- [Nuxt `useAsyncData` API](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Nuxt installation prerequisites](https://nuxt.com/docs/4.x/getting-started/installation#prerequisites)

## Outcome

The migration is compatible with the configured Nuxt modules and local Nitro mock
mode. Follow-up evidence is maintained in the 2026-08-25 revalidation report and
the feature-list entries for #460, #461, and #471. The old research file was
restored because epic #457 links it as a durable decision record.
