---
date: 2026-02-12
topic: nuxt-server-migration
---

# Nuxt Server Migration

## What We're Building

Migrate ECAS e-commerce frontend from external backend API (`https://dev-backend.ecasmag.ro/ecas`) to self-contained Nuxt server. The external backend is abandoned and no source code is available.

**Minimum viable scope:** Authentication + read-only data (products, profiles, browsing) to make the application functional again.

## Why This Approach

Chose **Mock data + Firebase auth** approach because:

- Immediate ability to run and test UI without database setup
- Lowest complexity—no DB schema design or migration required
- Firebase is already configured and used for auth in current codebase
- Incremental: can replace mocks with real DB connection later without architecture changes

Other approaches considered:

- **Firebase auth + Firestore:** Real data from day one but requires Firestore schema design and learning Firestore queries
- **Proxy + gradual migration:** Safer rollback but adds complexity of hybrid architecture

## Key Decisions

- **Data source:** Start with hardcoded mock data in Nuxt server routes; defer DB decision (Firebase Firestore vs PostgreSQL) until after UI is validated
- **Auth:** Keep existing Firebase auth implementation (`authStore` + Firebase SDK) – this is already working
- **Route structure:** Implement Nuxt server API routes in `/server/api` matching current service endpoints structure for easy migration
- **Migration priority:** Implement read-only endpoints first (products, profile) then transactional (cart, orders)
- **Response format:** Maintain existing `{ status: string, data: T }` pattern so frontend services don't need changes

## Open Questions

- What mock data is needed? (Products sample data? User profiles? Categories?)
- Should auth middleware be server-side or keep existing client-side approach?
- Which specific endpoints are highest priority for the first working iteration?
- Do you want to preserve the exact external API contract, or can we simplify it?

## Next Steps

→ Run `/workflows:plan` to create implementation plan for:

1. Setting up Nuxt server API routes structure
2. Implementing mock data endpoints for auth and read-only features
3. Verifying existing frontend works with new Nuxt server
4. Creating migration checklist for remaining endpoints
