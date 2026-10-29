# Issue #830 source-only migration plan

This runbook describes a reviewed plan for the #830 cleanup/recovery migration. It
does not authorize or perform host activation. Do not run an installer against the
installed Mac mini state from this source checkout.

## Required release authority

The release identity must be the exact human-merged PR that closes issue #830. The
plan must bind the repository, PR number, PR head, merge commit, and issue-closing
relationship from live GitHub evidence. The merge commit must be the clean checkout
being planned and an ancestor of the current `origin/main`. A different merged PR,
stale source tree, dirty checkout, or unverifiable GitHub response fails closed.
Issue number, PR number, merge SHA, and source manifest are explicit plan inputs;
they must not be inferred from branch names or old installation receipts.

## Read-only plan and stage

Plan generation reads the source release and bounded host inputs, then returns a
canonical plan digest. Staging writes only a new private release directory in the
source or explicitly selected staging area; it must not write installed host files,
settings, workflow prompts, registry, helper, automation state, or scheduler files.
Before any later activation, a human reviews and approves the exact digest. A changed
source file, host input, or plan produces a different digest and requires review
again.

Host inputs are bounded snapshots: installed settings, relevant workflow files,
the current helper bytes and protocol identity, registry shape/history summary, and
sanitized lease inspection including current generation and active-command state.
The plan carries exact input hashes and canonical host/lease identity. The planner must
reject stale, missing, malformed, symlink-ambiguous, or generation-inconsistent
inputs. It performs no process control, token discovery, keeper acquisition, GitHub
mutation, or automation update. The native caller must obtain fresh evidence and
recheck the same lease generation immediately before any eventual write.

## Policies and rollback boundary

The approved policy baseline is a hash of the effective current policy profile plus
the exact prior bytes of every file that the proposed patch changes. The plan must
show that current enablement flags, reviewer configuration, cadence, ownership rules,
trust lists, and routing limits remain intact, while preserving all existing claim
and history records. Legacy records with no explicit lane retain their existing
meaning. Deduplication is canonical-host + lease-generation aware across the
recovery intent ledger and cleanup receipt ledger; a symlink alias cannot create a
second reservation, and an unrelated canonical host remains independent.

The previously installed helper is retained byte-for-byte as the rollback helper.
The future activation write set is limited to reviewed settings/workflow assets and
their separately manifested release/backup files. The issue registry and its history
are not rewritten or restored. Rollback restores only explicitly patched settings
and workflow bytes after reconciling newer live state; it never blindly restores an
old registry snapshot or replaces the permanent lease inode. Preserve release,
backup, and plan manifests for audit.

Do not edit automation TOML or call the automation update tool as part of planning,
staging, or this issue's source migration. Any later scheduler change needs its own
reviewed watched step with cadence and identity preserved.

## Commands for a separately authorized watched installation

Run every command through the caller's own registered work-lane command. Replace
placeholders with the actual thread, token, exact human merge and closing PR.

```text
python3 .codex-autonomy/install.py --thread <chat> --lease-token <own-token> --stage <private-external-folder>
python3 .codex-autonomy/install.py --thread <chat> --lease-token <own-token> --merge <exact-merge> --pr <closing-pr> --plan <private-external-plan.json>
```

Stage is available before merge; the authoritative plan requires the human-merged
release. Both outputs must be outside the installed host. Review the private plan's
rendered assets, source/input hashes, preserved settings and backup/rollback scope.
Only after separate explicit owner approval of its digest:

```text
python3 .codex-autonomy/install.py --thread <chat> --lease-token <own-token> --merge <exact-merge> --pr <closing-pr> --activate <private-external-plan.json> --approve-plan <approved-digest>
python3 .codex-autonomy/install.py --thread <chat> --lease-token <own-token> --rollback <installation-backup-folder>
```

Activation rechecks inputs before its first write and immediately before replacing
installed assets. The approved lease generation and permanent inode must match.
No helper transition is supported: differing bytes require review and the separate
old-command completion/release/reacquire procedure, never competing keepers.
Rollback is explicit, checks every installed output against its recorded digest
before restoring any asset, and refuses newer settings/workflow changes. A failed
rollback reports a recoverable backup/journal location for owner reconciliation.
Backups are private and checksummed; the installation journal is append-only.

## Current state

This is documentation and test-fixture scope only. Issue #830 still requires the
human-merged release provenance, reviewed plan digest, fresh bounded host snapshots,
and a separately authorized watched activation before any host migration is
considered. No host mutation is part of this source change.
