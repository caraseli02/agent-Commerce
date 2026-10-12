# Stripe activation Gate A runbook

This procedure turns the Phase B requirements in the [Stripe payment and
recovery ADR](../../system-design/08-stripe-payment-provider-and-recovery.md)
into reviewable deployment evidence. It is not an activation approval. Keep
Stripe disabled until every prerequisite and replay result is reviewed for the
exact candidate deployment and database.

## Entry conditions

Do not start a deployed replay until the backend and UI capabilities required by
#559 are merged and reviewed: #556, #588, #586, and #587, including the
unrecognised-refund handling in #660. #660 is a direct #559 prerequisite.

The #556 owner decision accepts deterministic Stripe.js-double coverage for
that issue's UI criteria. It assigns one real sandbox card success and one real
3DS challenge to #559 Gate A. Both remain required before Gate A approval.

The exact checked-in off defaults are `PAYMENTS_PROVIDER=mock` and
`STRIPE_GATE_A_APPROVED=false`. While the inventory is incomplete, verify the
shared Preview/Production predicate remains off and do not enable either flag
there. The server activation predicate requires both
`PAYMENTS_PROVIDER=stripe` and `STRIPE_GATE_A_APPROVED=true`. Do not set either
on the shared Preview or Production environment. The isolated sandbox check
below requires an explicit owner decision before those existing flags can be
temporarily enabled on the isolated candidate.

## Inventory and reachability record

Choose a UTC inventory cut time and the exact candidate Git SHA. Save the
provider responses in the task's review evidence, with credentials and
connection strings excluded. Record the source, query window, page/cursor for
each request, returned count, and first/last creation time. Continue until the
provider returns no further pages for the bounded window. If a page, date range,
deployment, alias, or commit cannot be retrieved, mark the inventory incomplete
and stop before activation.

Set the window to cover the full deployment-retention horizon, not just the
provider's default recent page. Confirm that the query supports the required
older dates and reconcile its counts with Vercel's project deployment list and
known aliases. A response with no next page proves only that the queried window
ended; if the connector cannot enumerate an older range, request a read-only
provider export and leave the inventory incomplete until the gap is reconciled.

For every deployment returned for the Vercel project, record only the metadata
needed to classify it: deployment ID, creation time, state, target, Git branch,
commit SHA, active aliases/routing, and the verified database branch, database,
and runtime role. Do not store deployment URLs or environment-variable values
in durable documentation. Keep exact deployment IDs and time-bounded metadata
in the private review evidence when needed to rerun the inventory.

Classify the code revision against the merged mock-writer guard commit
`5d1869715d1cf4e01ef84c4b5aee680e1ff7afb3`. Git ancestry can identify revisions
that include the guard, but it does not prove that a deployment is unreachable
or that its database is isolated. Treat missing ancestry, missing deployment
metadata, unclear routing, and unknown database bindings as unresolved writers.

Use Vercel's deployment-specific environment details and Neon branch/endpoint
metadata to map each deployment to its actual database branch. Project-level
environment-variable scopes alone do not prove which value an already-built
deployment uses. Never decrypt, print, or copy a connection string into the
record. If the binding cannot be established without exposing the secret, ask
the project owner to verify it in the provider dashboards and record only the
branch/database/role identity. A protected URL is not database isolation.

The inventory passes only when every reachable Preview and Production runtime
is accounted for, every old mock-completion writer is upgraded, retired, or
isolated from the candidate database, and no deployment with unknown routing or
database binding remains. A deployment that is `READY` or has a direct alias
must be considered reachable until the owner verifies otherwise. Keep a list of
non-ready deployments in the evidence too, so the inventory's scope is clear.

## Candidate isolation plan

Use a dedicated Neon child branch from the existing Preview data branch for one
activation-candidate Preview deployment. Use only the repository's public mock
and synthetic checkout data; do not branch production customer data. Bind that
database to one explicitly named Vercel Preview Git branch using Vercel's
branch-specific Preview environment-variable scope for `DATABASE_URL`. Keep
the repository's ordinary Preview binding to `vercel-dev` unchanged.

Create the candidate deployment only after the branch-scoped value is set.
Vercel requires a redeployment for environment-variable changes to take effect;
adding Git branch metadata after a prebuilt build also cannot change values
already embedded at build time. Therefore, do not reuse an old deployment as
the candidate. Verify the candidate deployment's actual Neon branch binding
using provider metadata before seeding test data. Neon branches are independent
copy-on-write database branches, so writes in the candidate branch do not
change the parent branch.

This is the recommended isolation shape, not evidence that it has been
configured. The current repository contract uses shared `vercel-dev` for
Preview and production for Production. A project owner must approve the
candidate branch and its private Vercel binding before any provider change.
Existing deployments keep their current binding until individually verified;
do not infer that an environment-variable edit changes their runtime.

References: [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables),
[branch-specific Preview variables](https://vercel.com/docs/cli/env), and
[Neon branching](https://neon.com/docs/introduction/branching).

## Cross-version replay

Run the replay only on non-production Preview data after the inventory is
complete and both database bindings are verified. Never send the replay to an
unmapped deployment or to the production branch.

1. Select a reachable deployment whose commit predates the mock-writer guard.
   Confirm its database binding and route are known. If no historical deployment
   can be safely mapped, the deployed replay remains blocked; a local regression
   test is not a substitute.
2. Create one synthetic checkout fixture on the old deployment's verified
   database and a matching fixture on the isolated candidate database. Use the
   same test checkout request, Order ID, and Payment ID in both fixtures. The
   candidate Payment must be `PENDING` and carry a non-secret Stripe-intent
   marker; its Order must remain unpaid. This replay does not require creating
   a PaymentIntent. Do not use real customer or production data.
3. Record read-only before-state for both copies: checkout request identity,
   Order status, Payment status, Stripe PaymentIntent marker, and the Neon branch
   identity. Confirm the two deployments resolve to different database branches
   before sending any request.
4. Replay the old deployment's normal checkout continuation through its
   historical `POST /api/orders/new` contract, using the matching synthetic
   checkout request and test principal. Use the request shape and auth behavior
   from that deployment's source revision; do not call `completePayment` through
   an invented endpoint or mutate rows directly to simulate the old writer.
5. Read both copies again. The old deployment may demonstrate its legacy
   ability to complete its own database copy; the activation candidate's
   Stripe-marked Payment must remain `PENDING`, and its Order must remain unpaid.
   If either copy is missing or the replay did not exercise the old continuation,
   the result is inconclusive, not a pass.
6. After the isolation replay passes, ask the owner to authorize one
   sandbox-only verification window on the isolated candidate. Use sandbox
   credentials and temporarily enable the existing provider flags on that
   candidate only. Complete one real sandbox card success and one real 3DS
   challenge. Verify the browser result itself does not make the local Payment
   paid; the authenticated Stripe webhook/reconciliation path must be the
   evidence that changes the candidate Payment to `PAID`. Record the exact
   deployment/config revision and event IDs, checkout/order/payment IDs,
   before/after states, and database branch identities, with secrets and
   connection strings omitted. Turn the candidate flags off after the run and
   before final Gate A review; never enable them on the shared Preview or
   Production environment as part of this sandbox check.
7. Finish the remaining #559 deployed acceptance flows against the safe
   Preview candidate: decline followed by retry; browser refresh and resume;
   provider cancellation followed by explicit checkout restart; full refund,
   refund webhooks, and reconciliation; and signed HTTPS webhook delivery with
   recovery across independent serverless invocations.
8. Force a normal-finalization crash after `PAID` and a REFUND-decision crash
   before Refund creation, with no browser return. Prove duplicate payment
   success delivery resumes each path safely. Confirm pending, failed, or
   unknown Refund states never resume fulfillment and the original success
   webhook is not acknowledged before durable Refund identity/completion.
9. Confirm duplicate event delivery and refresh/resume preserve the same
   payment authority. Attach exact command/request evidence and safe state
   snapshots to the #559 review; do not commit transient logs or payment data.

The card success and 3DS checks transferred from #556 are only two parts of
#559's acceptance. They do not replace any of the deployed recovery, webhook,
refund, cancellation, or non-fulfillment cases above.

This replay proves isolation only for the mapped deployments and candidate
branch in the recorded inventory window. It does not prove that an unlisted,
unreachable-to-the-inspector, or later-created deployment cannot write the
candidate database. Re-run the inventory if deployments or environment
bindings change before activation approval.

## Stop conditions and deferred work

Leave Gate A blocked if any deployment/database mapping is unknown, any old
writer shares the candidate database, the inventory is incomplete, sandbox
credentials or Stripe webhook verification are unavailable, either real
provider scenario has not been run, #660 is unsettled, or a replay result is
inconclusive. The owner must resolve the specific provider/isolation decision
and the missing prerequisite before retrying.

This runbook does not approve shared-database activation, alter database grants
or roles, retire deployments, or contract the schema. The owner-approved
sandbox-only candidate check above is not approval to enable the shared Preview
or Production database. Phase C (`FAILED` backfill/constraint
tightening/legacy-column removal) remains a separate later gate after every
writer using that database is upgraded, retired, or isolated and its
legacy-column dependencies are removed.
