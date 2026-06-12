# CLAUDE.md

Project-level guidance for Claude Code working in **ECAS**.

## What ECAS is
A Nuxt 3 + TypeScript e-commerce demo with Vue 3, Pinia, Tailwind CSS, Firebase, Stripe hooks, and local Nitro mock endpoints.

## How to work here
- Use **pnpm** for dependency and script commands.
- Prefer mock mode for local development and review.
- Keep tasks small and atomic.
- Verify before declaring success.

## Commands
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm generate`
- `pnpm preview`
- `pnpm lint`
- `pnpm pretty`

## Architecture shortcuts
- API flow: `plugins/api.ts` → `composables/HttpFactory.ts` → `services/*.service.ts`
- Mock backend: `server/api/`
- Auth/session state: Firebase + Pinia + token cookie
- UI: shadcn-vue / Radix-style primitives + Tailwind

## Verification order
1. `pnpm build`
2. `pnpm lint`
3. Smoke-test the affected screen or route

## Autonomous loop rule
One loop should do one narrow task, verify it, and stop.
If the task grows beyond a few files or turns into a second unrelated fix, split it.

## State
Use `PROGRESS.md` when work spans sessions or when a loop is intentionally paused.
