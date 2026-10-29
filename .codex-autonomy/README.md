# Native routing/recovery source

This directory is reviewed source, not the installed dispatcher. Source publication
and human merge never activate it. Follow the installed owner policy until a
separately approved watched installation. #830 is the corrective prerequisite for
#681, not a retroactive third child or operational acceptance of #681/PR608.

The existing dispatcher runs every five hours at :15, including overnight. The
independent reviewer retains its six-hour Madrid schedule and separate execution
lane. [The reviewed policy patch](migration-policy.md) preserves the effective
cleanup, concurrency, local-review, model-delegation and reporting policies.
No automation TOML, new scheduler, permissions or model setting is changed here.

## Migration

Use [the migration runbook](migration-runbook.md). `install.py` admits only a clean
exact human merge of the corrective PR closing #830 in this repository, with its
reviewed head, repository and current-main ancestry verified live. It rejects old
#683-only release substitution and arbitrary main/merged PRs.

Stage writes a new external private folder. Plan reads bounded installation inputs
and returns exact source/input hashes, full rendered changes, preserved fields,
backup/rollback scope and an approval digest. Both are nonmutating with respect to
installed state. The reviewed profile pins known policy/helper bytes; unknown
state requires review. Activation needs separate explicit owner approval of the
concrete digest and rechecks inputs immediately before mutation. It preserves the
already-reviewed byte-identical helper and permanent lock inode.

Only settings and dispatcher/native/investigation workflows are replaced. Existing
workflow bytes remain verbatim prefixes with the explicit patch appended. Settings
outside the reviewed activation write set remain. Registry mappings, dispatch
intents, parked/unpublished work, recovery/cleanup ledgers and reviewer history are
never rewritten. Unrelated append-only reviewer history does not stale a plan.
Private checksummed backups and an append-only installation journal support
conservative rollback of installation-owned assets only. Newer settings/workflow
drift stops rollback for reconciliation; old registry snapshots are never restored.
`watched_recovery_accepted` remains false pending separate operational acceptance.

## Live decisions and evidence

`router.py` classifies fresh complete live issues/PRs, never historical PASS alone.
`discover.py` paginates GitHub and emits the same classifier result for dispatch and
registry reporting. `scope_check.py` binds consumer/contract assessments to actual
working diffs, including renames and untracked path/mode/content hashes. Assess all
draft/human/Claude PRs and registered unpublished work; unknown overlap blocks.
Private assessments carry `prs`, `issues`, `unpublished`, `investigations` and exact
paths/consumers/contracts. Recheck live evidence during work and before publication.

`runtime.py` owns only its isolated mock server/schema and bounded report-only
investigation. It must preserve existing listeners, writers, ports and checkouts.
Environment failures are not application findings. Internal model delegates share
the builder claim and never supply independent acceptance. Real Husky checks and
opposite-builder local review remain mandatory; Vlad merges.

## Recovery admission

Both full recovery and terminal-owner cleanup use `admission.py`'s permanent short
metadata guard and canonical lane-root/generation identity. Any record in either
ledger, including legacy implicit-lane, prior or ambiguous delivery, blocks a
competing send. Native callers still prove stopped ownership and recheck immediately
before messaging. Metadata reservation is not permission to send or resume work.
Only the original owner resumes its expected generation. Blocked/parked work stays
preserved. Reviewer cleanup operates only within its own canonical lane.

## Verification

`python3 -m unittest discover -s .codex-autonomy -v` runs deterministic migration,
cross-ledger and process fixtures; owned-runtime tests require macOS lsof.
`tests/codex-routing.spec.ts` runs the portable safety seam through Vitest, including
admission tests. Temporary-host fixtures never install on the real host. Run one
strongest fresh repository delivery gate and normal hooks. No app/UI consumer is
changed by the installer; controlled installation and scheduled operational evidence
remain separately authorized work after review.
