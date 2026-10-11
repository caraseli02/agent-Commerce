# Demo component review contract

This matrix resolves the four components in issue #518. Paths are relative to
`app/components/`. Use mock mode and the bundled Admin Preview sign-in; no live
backend or production dependency is required.

| Component                                               | Disposition                                                    | Parent surface and reachable state                                                                                                                                                                                                                              | Evidence                                                                                                                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `layout/header/main-menu/Circles.vue`                   | Retired; source removed                                        | No import, template reference, or dynamic component lookup exists in the active header. Decorative blobs are not part of the demo navigation contract.                                                                                                          | Consumer/reference scan; build and typecheck. No screenshot is claimed for an absent surface.                                                                                                                |
| `order-summary/ProductCard.vue`                         | Retired; source removed                                        | No live parent. Checkout uses the existing order-summary table; catalog grids use `global/ProductCard.vue`, which is retained.                                                                                                                                  | Consumer/reference scan; build and typecheck. No screenshot is claimed for an absent surface.                                                                                                                |
| `dashboard/control-panel/settings-view/ProgressBar.vue` | Retired from the active demo contract; dormant source retained | Its only caller is legacy `settings-view/CustomerCredit.vue`, beneath the unmounted `settings-view/Index.vue`. The customer settings URL redirects to account/organization details. Do not restore settings just to demonstrate this chart.                     | `tests/e2e/control-panel-settings-redirect.spec.ts` proves the existing personal-customer redirect. The active account page still shows credit limit/available credit. No ProgressBar screenshot is claimed. |
| `icon/Upload.vue`                                       | Retained as a local SVG preview                                | `/dashboard/products/categories` → **+ Create New** → **Upload SVG icon**; or a category row's pencil → **Edit Category** → **Upload SVG icon**. Starts with a placeholder; selecting a valid SVG shows a sanitized 20 × 20 preview and emits it to the dialog. | `tests/e2e/demo-component-contract.spec.ts`: both dialogs at 1440 × 900 and 390 × 844; empty and uploaded previews, sanitizer boundary, console/network capture and screenshot attachments.                  |

## Reproduce the retained upload surface

1. Create `.env` from `.env.example`, enable mock mode, configure the documented
   local PostgreSQL database, and run `pnpm db:migrate`.
2. Start `pnpm dev`, open `/?signin=true`, choose **Admin Preview**, and sign in.
3. Open `/dashboard/products/categories`, then either dialog described above.
4. Select a small `.svg` file with MIME type `image/svg+xml` (maximum 100 KiB).
   For example, save this as `demo-icon.svg`:

   ```xml
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
     <circle cx="12" cy="12" r="8" fill="#007fff" />
   </svg>
   ```

5. Inspect the preview, then **Cancel**. Previewing reads the local file in the
   browser; it does not upload it to a service. Category persistence is outside
   this retained preview contract: mock taxonomy is rebuilt from bundled data,
   and Create/Update server mutations are not asserted by this review.

Run `pnpm test:e2e tests/e2e/demo-component-contract.spec.ts
 tests/e2e/control-panel-settings-redirect.spec.ts` (on one shell line). The
browser suite starts its own built mock preview with an isolated database.
Each upload case attaches `create-empty.png`, `create-uploaded.png`,
`edit-empty.png`, `edit-uploaded.png`, and `runtime.json` to its Playwright
result directory. `runtime.json` records console warnings/errors and failed
requests; assertions reject browser errors, hydration warnings and failed
requests. Screenshot references for the delivery run belong in the PR evidence.

The dormant settings subtree is deliberately excluded from the active review
set. Removing that entire subtree, its chart design, and its legacy tests is a
separate cleanup; this disposition neither restores it nor claims runtime
coverage for it. Existing public routes and buyer flows are preserved.
