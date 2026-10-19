# Codex native routing source

GitHub Actions stay disabled. Husky and independent local review govern acceptance; follow [local verification](../docs/agents/local-verification.md). The standalone CI migration is retired.

This directory is reviewed source for the externally configured Mac mini Codex
dispatcher. It preserves `.factory/`, the native global exclusion and both independent
reviewers. Routing/recovery version 1 retains the global execution lease, one implementing Codex issue,
one real chat/branch/worktree per issue, normal hooks and Vlad's merge.

`router.py` classifies complete live issue/PR evidence and selects implementation or
one report-only question. `discover.py` is a paginated read-only gh adapter. It emits
the same classifier result for dispatch and registry reporting. `scope_check.py`
binds consumer/contract assessments to the actual working diff and rejects expansion
against fresh open-PR/unpublished reservations. `runtime.py` owns a built mock server
and the explicit URL inside the existing local PostgreSQL isolated-schema wrapper.

Except for sanitized busy-owner inspection/recovery delivery metadata and the original
owner's zero-command checkpoint, host execution commands below must run through `native_lease.py run` under the caller's
own token; acquire with the actual chat ID, never adopt another owner's token. Release
last after commands stop. Protocol 2 adds sanitized inspection and bounded original-owner recovery; no takeover.
Only the installed release is active; legacy keepers remain unknown.

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
   assets outside the checkout, stages a checksummed immutable recovery release for the human-merged #683 closing PR and preserves
   registry history/activation flags/reviewer configuration. No queue is inferred
   from old PASS. The versioned native helper is installed under the SAME permanent lock inode.
   Reviewer source and policy are unchanged. Stop after activation: let its registered
   install command finish, release the original migration keeper, then reacquire with
   your actual chat ID and verify protocol 2 before ANY further command. Do not run
   simultaneous old/new keepers or replace/delete the inode. Unknown surviving old
   commands block the migration; never kill or displace them.
3. In the newly acquired protocol-2 watched lease run, prepare current assessments and run read-only
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
   transition before claiming routing rollout acceptance. Additionally observe a controlled
   ORIGINAL-owner interruption/recovery on an existing issue chat after merge: record
   actual chat/turn, generation, sanitized inspection, compact native status, durable
   fingerprint, exactly one delivered request, original-owner checkpoint/release,
   unchanged unpublished work/claim/PR and zero displaced commands. Process fixtures
   and successful staging/setup do not satisfy this end-to-end watched recovery.
   Store a private append-only watched record; `watched_recovery_accepted` remains false
   until this evidence is independently reviewed. Keep PR608's evidence separate.
   Human review/merge is mandatory; no automatic archive or new per-issue scheduler.

Rollback only after the protocol-2 keeper/commands stop, under one watched exclusive
migration lease. Never restore an old helper over an active new command. Restore the
backed-up native helper as the last file, release that migration keeper and reacquire
before any further commands; keep the permanent inode. Reconcile new recovery receipts
and task history rather than dropping them. Rollback under that exclusive lease: restore backed-up workflow/settings/registry
after reconciling any newer live task history (never blindly overwrite newer claims).
Use native automation_update to restore the recorded prior prompt while preserving
cadence/identity. Leave release and backup manifests for audit. Failed installation
restores files it changed; no schedule is touched by install.py.

## Lease/recovery process verification

`native_lease.py` is reviewed protocol-2 source. Public `inspect` probes actual flock
contention, binds inode and generation to the responsive keeper, and returns only
owner/command identity summaries; no token, socket, command arguments or private logs.
Released owner metadata is harmless. Missing/mismatched/legacy keepers fail closed.
A command guardian retains the inherited descriptor until the actual process group
stops, including descendants that close inherited descriptors and outlive their parent.
Recovery never kills a process; bounded own-command timeout preserves the earlier
command runner contract. Deliberately detached processes outside the registered group
are not supported commands and must not be launched through this harness.

`recovery.py` uses the existing router.handoff fingerprint before native messaging,
serializes its separate metadata ledger and admits only fresh proven interrupted idle
original owners. It performs no discovery or work under another owner's lease.
See dispatcher-workflow.md and native-workflow.md for the exact native-tool sequence.
The portable process/recovery tests run in normal Vitest/CI. Tests crash only temporary
fixture keepers, never a host worker. Host helper/workflows/settings/automation are not
changed by these tests or by PR publication. More than three source files are needed
for this single recovery behavior because helper, controller, migration and executable
process evidence must be reviewed together; no second issue/behavior is included.
