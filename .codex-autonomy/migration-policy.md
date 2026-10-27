## Compatibility migration #830 — explicit reviewed policy patch

This section applies only after separately approved installation. Earlier owner
policies and their original bytes remain preserved above and in the named policy
files. This patch changes only routing/recovery admission and the corrections
listed here; it does not grant general authority to replace owner overrides.

The EXISTING dispatcher runs every five hours at :15, including overnight, in
Europe/Madrid. The EXISTING reviewer retains 03:45/09:45/15:45/21:45 (six hours).
There is no fixed dispatcher/reviewer offset. Preserve both automation identities,
status, project, model, reasoning effort, environment and notifications. Installation
never writes automation TOML or creates a scheduler. A later prompt change needs
separate approval and the native automation tool on the existing identity.

Use the installed immutable routing_release dispatcher/native/investigation
workflows for routing version 1, subordinate to the preserved owner policy files:
concurrent-review.md, lease-cleanup.md, husky-verification.md,
payment-work-authorization.md and model-delegation.md. Shared work/reviewer exclusion
in old templates is superseded: work uses the canonical work root, all reviewers
use the single separate reviewer root. Never inspect/acquire/change the reviewer
lane merely to install work-lane assets. Existing review isolation and independent
opposite-builder acceptance, actual Husky/local checks, reporting/freshness rules,
queue fairness and notification rules remain effective. Historical PASS alone
never establishes current readiness. Preserve flags and parked/unpublished work.

Before editing, record the complexity-based model plan and use actual native
gpt-6-luna delegation for eligible bounded work. gpt-6.1-sol coordinates integration
and delivery; gpt-6-astra requires an evidenced bounded escalation. Record actual
delegate IDs, requested model, reported model or null, scope, outcome and integration.
No token sharing, AI subprocesses, additional issue chats or reviewer launch.

Both cleanup and recovery MUST arbitrate canonical lane root plus generation under
the SAME native/recovery.lock. For cleanup, replace direct exclusive receipt creation
with <routing_release>/admission.py --host <lane-root> --receipt <private-intent.json>.
Read routing_release from installed settings; use its recovery.py as well.
The receipt retains all existing evidence/fingerprint/terminal-turn fields; a
normalized {id,status,completedAt} terminal_turn is also accepted. A send:true reservation is metadata only:
perform ALL stopped-owner proofs and immediate pre-send rechecks in lease-cleanup.md.
Keep send_attempted before native delivery. Any prior intent/delivery or ambiguous
record in EITHER ledger blocks a competing request, including after resolution.
Recovery uses the same guard automatically. Native messaging remains explicit;
no helper sends, interrupts, adopts or continues blocked/parked work. Cleanup still
only checkpoints/releases the original owner; only the original chat may resume
its expected generation. Keep corroborated systemError proofs, bounded observation
and deferred-run rules. Ambiguous delivery never resends through the other path.

The byte-identical reviewed protocol-2 helper and permanent work-lock inode remain
untouched. No helper transition is authorized by this migration. Unknown helper
bytes/protocol/policy profile require review, never a competing keeper. Install or
rollback requires the actual caller's own work-lane lease, with only its registered
installer command running. Preserve registry mappings, dispatch intents, both
ledgers and all independent reviewer history. Do not restore an old registry.

Source publication and human merge do not activate this patch. A human approves
the concrete fresh plan digest before activation. watched_recovery_accepted remains
false pending separate independently accepted operational evidence for #681;
fixtures and installation do not close #681 or establish PR608 acceptance.
