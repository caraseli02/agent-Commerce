# Native Codex issue worker — routing version 1

This chat implements only its assigned issue and same-PR repairs until human
merge/closure. Dispatcher runs every five hours at :15; worker never selects another issue.
Apply migration-policy.md and the preserved installed owner policies first. Work
and review use separate lanes. Actual native Luna delegation is required for
eligible bounded tasks; Sol coordinates and integrates. Cleanup/recovery share
admission.py's canonical lane/generation guard before either native send.
Read dispatcher-workflow.md, investigation-workflow.md and the repository's current
main policy. Exactly one live Codex implementation includes pending local verification/first review.
Queue/parking is classified from live GitHub by discover.py, never a saved PASS.

Acquire native_lease.py with the actual worker chat ID and purpose work before live
discovery/mutation. Honor builder_enabled/native_execution_ready; busy/unknown yields.
Never use a dispatcher token. Resume only your own stopped turn with no surviving
registered command. Git/pnpm/browser commands use native_lease.py run. Keep the token
during native edits and release in the final tool call after commands stop.
No token takeover, expiry, lock deletion or resource-scoped lease migration.

1. Source host env.sh. Fetch/read current main policy, complete issue/feedback/linked
   PR evidence and all live Codex claims. Recheck eligibility and worker mapping.
   New conflicting implementation or duplicate issue PR fails closed. Claude labels,
   branches and explicit legacy claims are excluded. Preserve parked unpublished work.
2. Claim only the assigned eligible ready-for-agent child, with account/branch and
   a bounded sprint contract. Reuse its managed worktree, otherwise create latest-main
   isolated managed checkout; load ignored mock/local PostgreSQL config without
   printing secrets, run ./init.sh once on a fresh checkout. Save actual registry path.
3. Assess planned paths, consumers/contracts against all open PRs (drafts/Claude/human)
   and all registered unpublished scopes. Unknown or overlapping scope requires
   rescope preserving every criterion or a blocker. Refresh actual diff during work
   and before publication with discover.py and scope_check.py; no shared-file exceptions.
4. Sol owns implementation/integration, Luna bounded support and Astra only a written
   concrete unresolved risk. Internal delegates share the claim, never accept it.
   Do not launch codex exec, runner.py builder, API AI workers or Claude reviewers.
5. Verify the affected consumers, focused checks/UI evidence and one strongest gate
   per repository policy. Preserve all real local hooks, normal pushes and one closing
   PR attached to this chat. Same-PR feedback repairs preserve queue identity, invalidate
   stale readiness and request independent Claude once per exact ready head with
   the external-review-request marker, and again for an unchanged head once a FAIL or
   BLOCKED on it is resolved without a commit. Read feedback directly; two unsuccessful focused
   repairs produce one concrete blocker. Never self-accept, merge, approve, force push,
   enable Stripe or edit shared reviewed snapshots.
6. Save real outcomes/exact heads, unavailable usage null and required continuation.
   Release last. Valid independent PASS/local verification queue for Vlad; quiet wait for unchanged state.
   Preserve chat/branch/worktree until human merge/closure, no per-issue scheduler.

## Original-owner recovery

On an explicitly scoped recovery request, first prove YOUR earlier turn stopped via
native chat status and run installed `native_lease.py inspect` without any token.
Require your actual chat/purpose and expected generation, no active command, and
matching recovery fingerprint; unknown or a surviving command yields without takeover.
Resume `native_lease.py acquire --thread <actual-id> --purpose work --resume
--generation <expected-generation>`; only this original chat obtains its private token.
Before further Git/pnpm/browser commands or edits, call `recovery.py --host <host>
checkpoint --thread <actual-id> --generation <generation> --fingerprint <intent>
--token <own-token>` as a short local metadata operation outside `run` (checkpoint
requires zero active commands). Save the checkpoint, inspect preserved worktree/diff and
prior verification, then continue only this same issue/PR and release last. If actual
acquisition returns a NEW generation because the old lock was already free, do not
checkpoint the old request; release, reconcile old intent as resolved and wait for normal
dispatch. Never share the token, restore another owner's lease, kill commands or delete
lock/owner metadata. Reviewer selection/verdict policy below is unchanged.

## Safe scheduled preflight

When `settings.json` has `native_preflight_requested: true`, perform a smoke
run only: acquire with `--purpose smoke`, create through a native file tool
`native/preflight/<actual-chat-id>.tool.txt` containing exactly
`Native app-chat tool proof: <actual-chat-id>` plus newline, then run
`native_preflight.py --token <token> --thread <actual-chat-id> --cwd <current-checkout>`.
It verifies local Node/pnpm/PostgreSQL, existing GitHub access, remote main and
reads the active issue pool. It never claims, changes labels, publishes a PR,
starts an evaluator or changes application source. Release last. Report a
first completed proof or a concrete failure; unchanged existing proof is quiet.

## Codex cross-review loop

The reviewer automation runs every six hours (03:45/09:45/15:45/21:45 Madrid) and creates a fresh local project chat for every
scheduled run (Vlad, 2026-10-08). It no longer resumes a standing review chat.
Each run reviews at most one actionable PR head and uses its own actual chat ID
with the same host lease and `--purpose review`. It requires `reviewer_enabled`
and `native_execution_ready`. It uses the dedicated reviewer root from concurrent-review.md, independent of the work lane; its review
fixture or checkout is separate from a builder's. GitHub exact-head reports and
the private journal preserve evidence across fresh chats and prevent duplicate
reviews. An unchanged head is not reviewed twice, except an INCONCLUSIVE retry or after a comment that starts with `<!-- external-review-request: <sha> -->` follows its newest FAIL or BLOCKED (docs/agents/local-verification.md § Verdict lifetime); a later main, PR body or label change never needs a new report. Busy or unknown lease ownership yields.
Review only a non-draft PR explicitly owned by Claude (label `agent:claude` or
verified legacy Claude branch/linked issue), never one implemented by this
Codex builder or its internal delegates. Missing or contradictory ownership
yields one specific blocker. Never implement or push to a Claude PR.

Read current GitHub head, diff, issue, comments, review threads, CI and
mergeability; compare exact-head evidence and independently verify the affected
behavior using the repository evaluator contract. One strongest gate and
necessary focused/UI evidence suffice. Only blocking findings can FAIL; a re-review
after a FAIL checks the earlier findings and the new changes only, and after two FAILs
on the PR since its latest PASS, on any head, posts BLOCKED instead of a third (docs/agents/autonomous-workflow.md § Blocking findings
and re-review rounds). Unattended protected-harness work stays
human-led; an explicit human request may authorize an interactive review.

Post one concise structured verdict per head with attribution, the exact
`<!-- evaluator-head: <sha> -->` marker and `## Evaluator verdict`; update its
linked issue's readiness on PASS, never merge or approve. INCONCLUSIVE is
nonfinal, uses its distinct marker and retries no sooner than two hours;
two unresolved prerequisite failures produce one blocker. Read GitHub directly,
keep private execution logs/actual-usage journal, release last and stay quiet
while no new head or re-review request exists. Claude reviews Codex output on its own
schedule; Codex does not start Claude.

## Husky acceptance — owner decision 2026-10-19

GitHub Actions stay disabled. Follow `docs/agents/local-verification.md`: real Husky checks plus independent opposite-builder review of the exact PR head/current base replace all hosted and standalone-CI prerequisites. Before PASS execute the selected fresh local gate and applicable runtime/browser checks; validate the live PR body. Include the `marker` from `node scripts/owner-attention.mjs local-readiness PR_NUMBER` on its own line in the report; award PASS only after those checks pass. Recheck `readiness.ready=true` before labels or queue admission. A new head requires a new review; a later main, PR body or label change does not (`docs/agents/local-verification.md` § Verdict lifetime). The marker alone is not test evidence. No service/client/App/health/reboot proof or hosted green check is required. Retired CI failures and their absence do not consume repair attempts. Actual local failures, conflicts, change requests, ownership, WIP, protected paths, default-off Stripe and human merge remain enforced. Existing chats surface meaningful owner attention; no bot notification or new scheduler is implied.

A final report stands until its head changes. An unchanged head is reviewed again only for an `INCONCLUSIVE` retry or after a re-review request (`docs/agents/local-verification.md` § Verdict lifetime); re-reviews after a FAIL follow the round rules in `docs/agents/autonomous-workflow.md`.
