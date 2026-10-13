# Codex native routing source

This directory is reviewed source for the externally configured Mac mini Codex
dispatcher. It does not replace `.factory/`, the native lease or either independent
reviewer. Version 1 retains the global execution lease, one implementing Codex issue,
one real chat/branch/worktree per issue, normal hooks and Vlad's merge.

`router.py` classifies complete live issue/PR evidence and selects implementation or
one report-only question. `discover.py` is a paginated read-only gh adapter. It emits
the same classifier result for dispatch and registry reporting. `scope_check.py`
binds consumer/contract assessments to the actual working diff and rejects expansion
against fresh open-PR/unpublished reservations. `runtime.py` owns a built mock server
and the explicit URL inside the existing local PostgreSQL isolated-schema wrapper.

All host commands below must run through `native_lease.py run` under the caller's
own token; acquire with the actual chat ID, never adopt another owner's token. Release
last after commands stop. No lease takeover or diagnostics/recovery in this release.

## Evidence and assessments

Private assessments JSON has `prs`, `issues`, `unpublished`, `investigations` maps/list.
Every scope contains exact `paths`, inspected `consumers`, `contracts` arrays. A path
ending `/` reserves its subtree. Paths cover actual diffs including rename sources.
PR scopes bind `head` to full live SHA; unpublished scopes bind `diff_sha256` to
`git diff --binary <base_at_implementation>` plus sorted untracked path, mode and content hashes from `scope_check.working_scope`, and cover all untracked paths. Candidate
scopes bind `issue_fingerprint` to router.fingerprint of the live title/body/labels/
updated_at object. This assessment is a reviewed assertion, not automatic consumer
discovery. Inspect callers and shared contracts; an unknown assessment blocks new
work. Recheck unchanged scopes when another reservation changes. Cross-builder
scopes include every draft/human/Claude PR and registered unpublished checkout.

Invoke `python3 <release>/discover.py --lease-token <own-token> --registry <host>/issue-chats.json
--assessments <private-assessments.json> --output <private-live.json>`. API failure
means no dispatch. It writes an adjacent `.registry.json` preserving every historical
entry and old fields while adding `routing_report`, `queued_at` and `parked_at`.
Review/save atomically under the lease. `active_issue` and historical verdicts are
legacy history, never current acceptance. On interruption reconcile actual worker
status and intent fingerprint before any send/chat creation.

For actual scope refresh, write a certificate with `diff_sha256` of the complete
binary working diff against recorded base and assessed paths/consumers/contracts.
Invoke `scope_check.py --lease-token <own-token> --checkout <worker> --base <sha> --certificate <private.json>
--live <private-live.json> --issue <n>`. The live snapshot must be no older than five
minutes; no untracked files at publication. Run during work and immediately before
publication; unknown scope/new overlap requires a complete rescope or blocker.

Runtime uses `runtime.py` as specified in investigation-workflow.md. The test command
is restricted to locked Playwright E2E/performance tests with an externally supplied
base URL; no second webServer or snapshot mutation. Other exploration/preparation is
read-only evidence gathering without this runtime helper. An environment failure
returns 75 and cannot become an app finding. Budgets include build/setup.

## Tests

`python3 -m unittest discover -s .codex-autonomy -v` exercises deterministic routing,
adapter/scope/migration and actual process lifecycle. `test_runtime` requires macOS
`/usr/sbin/lsof`; keep it in watched host validation. Normal Vitest/CI invokes the
portable routing/adapter/migration fixtures through `tests/codex-routing.spec.ts`.
No fixture awards final acceptance for the builder. Relevant application gates and
the independent evaluator remain required.

## Auditable migration, after human merge

1. Before merge, only stage with `python3 .codex-autonomy/install.py --lease-token <own-token> --stage <new-private-folder>`.
   Review source and its SHA-256 manifest; installed settings/workflows/registry and
   automation remain inactive. Do not copy unreviewed host executables into place.
2. After Vlad merges the closing PR, acquire the native lease in a watched local run,
   use a clean managed checkout at that exact merge commit and fetch origin/main.
   Run `install.py --lease-token <own-token> --activate --host /Users/work/.local/share/agent-commerce/autonomy
--merge <human-merge-sha> --pr <closing-pr-number>`. It verifies the exact checkout,
   current-main ancestry and live GitHub merged closing PR. It backs up old host
   assets outside the checkout, stages a checksummed immutable release and preserves
   registry history/activation flags/reviewer configuration. No queue is inferred
   from old PASS. No native lease/reviewer source is installed or modified.
3. In the same watched lease run, prepare current assessments and run read-only
   discovery, compare decisions to live GitHub and inspect the migrated reporting
   cache. Test a bounded controlled owned-runtime question if selected; preserve
   original workers and ports. Journal installation identity, heads and actual results.
4. Use the native `automation_update` tool to update the EXISTING
   `payments-and-system-design-controller` prompt from the installed automation-prompt.md.
   First read its current automation.toml and tool view; preserve id, kind, project,
   model, reasoning effort, environment, status, notification policy and the actual
   two-hour cadence. Never write TOML, duplicate a scheduler or shorten the cadence.
   The transition prompt already corrects cadence/stale examples without enabling
   uninstalled policy. The versioned prompt fails back to legacy policy if installation
   is absent. Record the native tool result in the private migration journal.
5. Observe the next existing scheduled run and one meaningful queue/parked routing
   transition before claiming rollout acceptance. Keep PR608's evidence separate.
   Human review/merge is mandatory; no automatic archive or new per-issue scheduler.

Rollback under the same exclusive lease: restore backed-up workflow/settings/registry
after reconciling any newer live task history (never blindly overwrite newer claims).
Use native automation_update to restore the recorded prior prompt while preserving
cadence/identity. Leave release and backup manifests for audit. Failed installation
restores files it changed; no schedule is touched by install.py.
