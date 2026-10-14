# One risk-driven report-only investigation

Run only the selected concrete question on the recorded main/head. Report-only
means no tracked app edits, commits, pushes, PR creation, claims, automatic refactor,
automatic `ready-for-agent` promotion or reviewer launch. Review preparation is a
packet of evidence, not an independent verdict. Never alter another worker's files.

Record candidate key, kind, question, user impact, missing evidence, inspected
independence, expected minutes and head in private assessments. The deterministic
planner ranks impact, unanswered evidence and cost, with last-run rotation only a
tie-breaker. Reuse valid evidence for the unchanged head/question. Stop at one
defined outcome: confidence, reproduced candidate failure or environment evidence.
The whole run, including installation/build/setup, has a configurable 30–45 minute
trial budget, default 40. Read-only preparation can be shorter. One at a time under
the existing native global lease; running implementation retains that lease.

Runtime needs a separate clean mock managed checkout at the recorded main. Install
locked dependencies and ignored local mock configuration without printing secrets.
Pass the existing local PostgreSQL connection; hosted databases are prohibited.
Use `runtime.py --lease-token <own-token> --checkout <investigation-tree> --worker-checkout <reserved-worker-tree>
--head <recorded-main> --minutes 40 --port 3206 -- <focused read-only command>` through
the native lease. The helper builds this checkout, uses the repository's existing
random test-schema wrapper, launches its own built server, waits for readiness and
checks listener PID identity before and after the command. It passes the explicit
PLAYWRIGHT_BASE_URL; use the performance config or the E2E config (which disables webServer for an explicit base URL). Never attach to a
preexisting listener. Owned test/server process groups are stopped/reaped on success,
failure, interruption or timeout. An occupied port is preserved. Missing database,
toolchain, readiness, budget or identity is exit 75 environment evidence, zero app
findings. Do not call a failing assertion proof of an app cause.

Confirm a candidate failure with one focused reproduction within the remaining
budget; retain trigger, expected/actual behavior, head, command and evidence. Separate
app, test and environment causes. No generic suite rotation or repeatedly passing
full gate. A clean run files nothing.

Before filing use complete paginated GitHub open AND closed issues across both
builders. Run `router.admit_findings` with current history. Stable keys match the
existing Claude convention: spec+test title, advisory/package, budget or invariant.
Include both `claude-maintenance` and `codex-maintenance` markers, plus inspect
semantically equivalent existing issues (different marker/task names cannot hide a
duplicate). At most three new needs-triage findings per run, none at five open
maintenance findings; refresh backlog before each filing. The planner's admission
is a cap, not a demand to file. Use a temporary body file and normal gh issue create
with only needs-triage. Never modify an existing issue as part of investigation.

Body starts `<!-- codex-maintenance: <task>:<stable-key> -->`, records two reproductions
on the pinned head and actual evidence, suspected cause, smallest proposed scope and
Vlad's triage decision. No credentials or sensitive logs. Journal outcomes with usage
null, record reusable evidence and release last. Meaningful evidence/decisions merit
notification; unchanged findings, confidence and waits remain quiet.
