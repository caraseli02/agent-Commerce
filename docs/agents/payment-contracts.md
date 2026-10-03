# Payment and checkout contract guardrails

Apply these rules to payment state, checkout workflow, paid recovery, public checkout errors, and their UI consumers. Keep issue-specific scope, model assignments, and acceptance evidence in the GitHub issue and session record.

## Ownership and boundaries

- Payments owns `PaymentStatus` and `PersistedPaymentStatus` in `server/domain/payments/contracts.ts`. Checkout owns workflow states and paid recovery decisions in `server/application/checkout/contracts.ts`. Import owner contracts instead of redeclaring unions. Preserve wire/persisted values, including legacy `FAILED`; Refund completion never rewrites historical `PAID`.
- Parse untrusted state fields before acting on them. Query generics do not validate stored state. Existing corrupt Payments retain identity with a null parsed status; missing rows remain distinct. Return structured recovery outcomes and translate them into typed public errors at the application boundary. Recovery writes admit only known eligible states.
- Public checkout codes and static coded HTTP copy belong to the pure shared `types/order/checkout-error.ts` contract. Routes use `checkoutErrorData` for typed diagnostics or `checkoutErrorResponse` for catalog responses. Browser code must not import database/provider modules.
- Buyer messages and action policies use the exhaustive map in `helpers/checkout-error-presentation.ts`. Payment labels use `getPaymentStatusById` and the explicit map in `types/order-summary/item.ts`; never use enum reverse lookup. Unknown states display an explicit unknown label. Business decisions depend on codes, never English text.
- Unknown errors use safe buyer copy and cannot authorize financial side effects. Failure-page navigation clears local error/client-secret context independently of remote cancellation; preserve the known-code cancellation policy and verify both paths.
- SQL predicates, typed discriminants, internal diagnostics, ordinary HTTP authentication/not-found responses, and compatibility fixtures may retain literals. Diagnostic text is deliberately separate from buyer copy and must not choose buyer actions. Do not introduce a global constants bucket or blanket string ban.

## Executable prevention and verification

`tests/payment-contract-ownership.spec.ts` scans scoped server declarations/producers and UI payment enum lookups in TypeScript and Vue scripts/templates, including named import aliases for payment labels. Negative fixtures prove the guard rejects duplicates and enum-derived labels. This is syntax analysis, not complete type/data-flow analysis: indirect aliases, assertions, and arbitrary producer indirection still require review.

Typecheck rejects undeclared public codes and incomplete presentation maps. Parser, corrupt-state, application rollback, and serialized HTTP-to-composable tests prove boundary rejection, side-effect refusal, and producer/consumer agreement. Browser tests exercise actual failure navigation and actual label components; helper tests alone do not prove their callers were migrated.

Inspect the diff and affected consumers, then select only relevant tests with reasons. After repairs rerun only invalidated checks. Use `verify-ui-change` for the impacted routes/viewports and commit a diff-bound visual assessment. Run one strongest clean-tree delivery gate and reuse matching evidence for normal pre-push; CI verifies independently. Evaluators must check all issue criteria and the exact PR head before awarding PASS. See [verification](verification.md) and [autonomous workflow](autonomous-workflow.md).
