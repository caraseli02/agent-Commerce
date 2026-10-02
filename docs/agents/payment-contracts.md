# Payment and checkout contract guardrails

Use this checklist when changing payment state, checkout workflow, paid recovery, public checkout errors, or their UI consumers. Issue [#583](https://github.com/caraseli02/agent-Commerce/issues/583) implements the existing-surface cleanup and its executable regression checks in one PR.

## Ownership and compatibility

- Payments owns `PaymentStatus` and `PersistedPaymentStatus` in a pure contract file under `server/domain/payments/`; its public module re-exports them. Application code imports the owner contract instead of redeclaring a union. Browser code must not import a database/provider module.
- Checkout application owns checkout workflow states and `PaidRecoveryDecision` in a pure file under `server/application/checkout/`. Database fields are untrusted until parsed; a query generic or type assertion is not validation.
- A pure shared checkout error contract under `types/order/` owns public codes used by both server responses and browser recovery. Provider errors and PostgreSQL diagnostic codes remain separate.
- Presentation owns explicit labels/messages and recovery actions keyed by the public contract. Use exhaustive typed mappings; business decisions must not inspect English messages or derive labels from enum member names.
- Preserve wire and stored values, including legacy `FAILED` and numeric `PaymentStatusEnum` values. Refund is a separate financial fact; refund completion must preserve historical `PAID`.
- Unknown state must retain the caller's conservative recovery/rejection result. Unknown error codes use safe presentation and must never grant payment, completion, fulfillment, or an automatic retry with financial side effects. Preserve distinctions between absent, known, and invalid persisted recovery decisions.
- Typed discriminants, SQL state predicates, diagnostic messages, and static compatibility fixtures may contain literals. Do not add a global constants bucket or a blanket string ban.

## Fixed #583 acceptance map

| Requirement                          | Existing consumers to inspect                                                                                      | Required evidence before delivery                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical payment states             | Payments `index.ts`, `stripe-intents.ts`, `stripe-webhook.ts`; checkout payment readers/writers                    | Imported owner types; parser tests for every accepted value, legacy `FAILED`, and unknown/non-string inputs                                                                      |
| Canonical workflow and paid recovery | `place-order.ts`, finalization, cancellation, restart, reservation renewal, resume, compensation, local state read | Owner contracts; invalid DB values retain conservative outcomes; existing replay/race tests remain valid                                                                         |
| Shared public errors                 | `PlaceOrderError`, orders new/restart/resume routes, `useOrder`, checkout error store                              | Producers are typed against the same contract as consumers; malformed/unknown transport inputs are tested                                                                        |
| Explicit presentation                | `/checkout/fail`, `getPaymentStatusById`, affected callers                                                         | Exhaustive mappings; known review errors retain recovery actions; unknown errors have safe copy; existing numeric display values remain compatible                               |
| Prevent recurrence                   | Contract-focused tests and `pnpm typecheck`                                                                        | A failing regression demonstrates duplicate owner definitions are detected; an undeclared public producer code is rejected; adding a known code requires its presentation policy |
| UI behavior                          | Failure page and payment-label consumers                                                                           | Targeted desktop/mobile browser proof of cart/quote review, generic unknown error, and safe retry/navigation                                                                     |

The contract cleanup may touch several consumers because the outcome is shared consistency. This is a scope review, not a reason to create separate helper-only PRs. New payment behavior, migration, recovery selection policy, provider activation, Payment Element, and provider Refund continuation belong to their existing issues.

## Implementation and check selection

1. Inventory current state/error values and consumers. Capture compatibility fixtures before changing contracts. Extend contract tests with unknown/corrupt inputs first.
2. Introduce owner contracts and boundary parsing; migrate the complete existing consumer set. Keep invalid input handling explicit, including persisted recovery decisions.
3. Align typed public producers, UI normalization, and exhaustive presentation policies. Add an ownership regression using TypeScript syntax analysis scoped to payment/checkout production sources; do not use a broad text search that rejects legitimate SQL or fixtures. Prove the guard fails against an injected duplicate declaration. Until #583 implements this, these are review requirements, not an existing automated gate.
4. Run only affected suites after each change using `pnpm test <files>`. Relevant starting suites: `payment-preparation`, `stripe-payment-intents`, `stripe-webhook`, `paid-checkout-finalization`, `order-payment-state`, `use-order`, and `checkout-outcome`; resolve exact filenames with `rg --files tests`. Include cancellation/resume/compensation tests when their consumers change. Do not run every payment suite merely because it exists.
5. Run changed-file lint and typecheck when type evidence is invalidated. Use `verify-ui-change` for affected browser flows; extend `tests/e2e/checkout-result-states.spec.ts` with targeted assertions rather than the full E2E matrix. Commit a diff-bound visual assessment after tracing actual observable consumers.
6. Commit the coherent implementation, then run one `pnpm verify:handoff` delivery gate from a clean tree. Normal pre-push reuses matching successful evidence; fresh CI remains independent. Do not invoke `verify`, `verify:full`, and `verify:handoff` in sequence.

The PR must close #583 and show evidence for every row above. Independent evaluation checks full criteria, public compatibility, actual guard failure cases, and conservative recovery. Tests passing alone do not certify review readiness.
