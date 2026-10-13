# Native Codex dispatcher — routing version 1

The existing `payments-and-system-design-controller` automation runs every two
hours, including overnight. It routes; one real native issue chat owns each issue
through implementation and all same-PR repairs until human merge/closure. Sol
coordinates, Luna provides bounded support and Astra handles a documented concrete
unresolved risk. Neither internal consultation nor self-auditing is acceptance.

1. Read host settings, this workflow, native-workflow.md and issue-chats.json.
   Honor builder_enabled/native_execution_ready. Acquire native_lease.py with your
   actual chat ID and purpose work before live discovery. On contention follow the recovery procedure below; unknown retains exclusion.
   Never inspect another owner's token, remove/expire a lock or launch AI workers.
   Every Git/pnpm/browser/discovery command runs through native_lease.py run.
2. Fetch latest main and read governing policy. Run installed `discover.py` with
   the existing registry and private scope assessments, writing a private snapshot.
   One deterministic classifier drives both its decision and `.registry.json`
   report. API failures stop dispatch; never fall back to cached acceptance.
   Reconcile its cleanup list with live merged/closed GitHub claims before selection:
   remove obsolete in-progress from this builder's completed issues, preserve the
   history/chat/worktree, and never delete branches or revive the completed claim.
   Review and atomically save the report under the lease, preserving every history
   entry and real chat mapping. `routing_report` is current reporting; old state,
   independent_verdict and active_issue are retained historical fields.
3. Supply commit-bound assessments for candidates, every open PR (draft/Claude/human
   included) and registered unpublished work. Include paths, actual consumers and
   shared contracts. Unknown scope prohibits new implementation selection. Inspect
   dependency/ownership prose; explicit legacy Claude claims are Claude-owned.
   No wildcard exception for lockfiles, shared tests, migrations or global config.
   During implementation and before publication refresh live scopes and invoke
   `scope_check.py`. New overlap requires a complete rescope or blocker; Known risks
   never authorizes overlap. Leave all reserved unpublished work intact.
4. Follow the returned decision. Exactly one live implementation, including waiting
   CI/first evaluation, holds the implementation slot. Actionable repairs use the
   original issue/chat/PR before new claims; never interrupt another active worker.
   Initial queue admission requires an open canonical Codex PR, trusted independent
   exact-head Claude PASS, required green checks, mergeability and no change request.
   `queued_at` retains queue identity through repairs and re-review, never readiness.
   At two queued PRs stop new claims; an already live issue may finish and queue.
   Parked/blocked claims preserve their work and do not hold the live slot. Oldest
   eligible unparked work precedes new claims. Closed-unmerged PRs park for Vlad's
   explicit decision. Merged/closed work is reconciled before selection, never revived.
5. For continue/repair/resume, use compact wait_threads status and the real registry
   mapping. Running/pending/unknown workers require reconciliation, no duplicate
   messages. Recover missing mappings through list_threads/read_thread before
   create_thread. New issue chat: list_projects then native create_thread in the
   saved local project with Sol; first turn only initialization. Save actual returned
   threadId, or pending clientThreadId without treating it as a threadId. No duplicate
   creation after uncertain results. Worker claims after fresh live eligibility.
6. Use `router.handoff` to bind intent to issue/action/exact head/findings/scope.
   Persist intent/fingerprint BEFORE release/send. Same fingerprint suppresses a
   resend: reconcile actual worker status/last receipt on the next wake, record an
   explicit resolved-delivery retry only if delivery is known absent. Vlad authorized
   these scoped messages only. Release then send in the final tool call; no tools
   follow it. Worker acquires its own token, never the dispatcher's. New feedback,
   CI failure/conflict or meaningful cleanup can dispatch; unchanged waiting cannot.
7. With no eligible implementation/capacity, choose the planner's ONE unanswered
   report-only investigation by user impact, uncertainty, independence and cost.
   Rotation breaks ties only. Read investigation-workflow.md; main/head is pinned,
   trial budget defaults to 40 minutes (maximum 45), one investigation at a time
   under the existing global lease. Never start an independent reviewer or generate
   self-acceptance. Reuse unchanged valid evidence; no repeat full gate for busyness.
8. Append private real outcomes, exact heads and usage null when unavailable. Release
   last after registered commands stop. Notify meaningful delivery, completed repair,
   reproduced risk or a necessary human decision; stay quiet on unchanged/busy state.
   No merge, approval, force push, hook bypass, shared snapshot edit, Stripe activation,
   new scheduler, lease takeover or resource-scoped lease migration. Independent Codex
   reviewer and Claude reviewer ownership stay unchanged; PR608 rollout stays separate.

The executable policy lives in the installed immutable release. Installation and
automation prompt migration require human merge followed by a watched rollout.

## Busy-owner recovery — protocol 2, recovery version 1

This path runs before lease acquisition and performs only local sanitized inspection,
compact native owner-chat status and durable recovery delivery metadata. It never runs
Git/pnpm/browser/discovery, changes claims, edits worker source, controls processes or
uses another owner's token. Global execution exclusion remains unchanged. Legacy or
unresponsive keepers are unknown; no compatibility takeover or automatic installation.

1. Invoke the INSTALLED `native_lease.py inspect` without credentials. `free` permits
   ordinary own acquisition even when owner.json remains. `unknown` retains exclusion.
   `held` binds actual inode contention to a responsive protocol-2 keeper generation,
   owner chat/purpose and active registered-command summaries. Logs, age and metadata
   alone prove nothing. A surviving command or running worker stays quiet and excluded.
2. Cross-check the returned actual thread with native `wait_threads(timeoutMs: 0)`.
   Use `read_thread` only to establish whether the last turn was interrupted and stopped
   when the compact snapshot is insufficient. Normalize PRIVATE chat evidence with
   `thread_id`, `status` (`running`, `idle_interrupted`, `idle_completed`, `unknown`),
   `prior_turn_stopped`, `interrupted_turn_id`, `evidence` (native output/cursor reference)
   and `observed_at` (UTC epoch seconds). Idle alone is not proof of interruption. No
   interrupt or message to a healthy/running/pending/unknown owner. The registered issue
   mapping must match uniquely; review/smoke/closed/blocked owners are not recovered.
3. Run installed `recovery.py --host <host> prepare --registry <host>/issue-chats.json
--chat <private-chat-evidence.json>`. It re-inspects, checks <=60-second native evidence
   and uses router.handoff's intent fingerprint. A short permanent recovery.lock serializes
   metadata only; it grants no execution permission. recovery.json is separate from the
   claim registry so a contender cannot modify the owner's task history without its lease.
   Persisting `prepared` happens BEFORE the native send. Parallel contenders and an
   interrupted dispatcher cannot resend that generation. No new chat or scheduler.
4. For `send: true`, recheck compact native status and inspect immediately before sending;
   if changed/unknown do not send. Send only the returned scoped message to its original
   thread via native send_message_to_thread, as the FINAL tool call. No parent token is
   sent and no execution lease is held by the dispatcher. The owner independently verifies
   its earlier turn stopped, resumes only its own generation and checkpoints before work.
5. On the next existing wake, `reconcile` with `--generation`, `--fingerprint`, registry/chat
   inputs and `--delivery <private-delivery.json>`. Delivery evidence binds `thread_id`,
   `fingerprint`, `state` (`delivered`, `absent`, `unknown`) and native `evidence` plus fresh `observed_at` (<=60 seconds).
   Absent delivery additionally needs `absence_proven: true`: a stopped sender with
   proof the send was never attempted, or native delivery reconciliation confirming
   no request is queued/in flight. Absence from chat history alone does not prove this.
   A send timeout/exception means unknown, never absent. Read native history for the exact
   request fingerprint/receipt before retry. Only positively absent delivery allows one
   bounded retry of the SAME message. Running/delivered owners are never resent. Two
   unresolved reconciliations yield one actionable blocker; persist before notifying.
   Subsequent unchanged wakes stay quiet. Changed/unknown generation remains excluded.
6. Released lock or original-owner checkpoint resolves this recovery attempt. Preserve
   interrupted work and keep all implementation/repair work in its original chat/PR.
   Keep watched post-merge evidence pending until an actual interrupted original owner
   recovers, with no unpublished loss, duplicate delivery/claim or displaced commands.
