# Temporary separate Codex review — owner decision, 2026-11-03

Claude PR review is unavailable. Vlad selected a separate Codex reviewer for
Codex-built PRs. This takes precedence over older opposite-builder/Claude-only
review requirements until Vlad explicitly restores or replaces it. The existing
Codex reviewer also continues reviewing Claude-built PRs. The later owner-approved
queue transfer below replaces the original no-transfer scope for eight open issues.

- Reuse the existing scheduled Codex reviewer, one PR per fresh review chat in the
  dedicated reviewer lease lane. Keep its cadence, model, permissions and isolation.
  Builders and the dispatcher never launch a reviewer or accept their own output.
- A Codex PR's evaluator must be a different real chat and have had no implementation
  or delegated implementation involvement. Resolve the original builder chat from
  the issue registry/chat history, including manually requested PRs. Missing or
  uncertain identity is INCONCLUSIVE; never invent IDs. Record both real IDs:

  ```text
  Independent evaluator: Codex (separate reviewer; no implementation involvement).
  <!-- codex-review-session: builder=<actual-builder-chat-uuid> reviewer=<actual-review-chat-uuid> -->
  ```

  Put each line on its own line alongside the existing evaluator-head and
  local-verification markers. The two IDs must differ. The parser checks the audit
  record; the reviewer must corroborate identity and non-involvement. A builder's
  checklist, internal consultation or a marker alone never supplies acceptance.

- Review exact head/current base independently, execute the selected fresh local
  gate and applicable browser/runtime checks, and validate live PR metadata. Apply
  the existing rubric, protected-path authorization, conflicts and change requests.
  No local receipt reuse from the builder, hosted CI requirement or hook bypass.
- A trusted exact-head Codex PASS with that session record satisfies the former
  Claude reviewer requirement. Existing valid Claude reports remain valid; preserve
  history, verdict rounds and new-head invalidation. Readiness still requires
  `local-readiness` to return `readiness.ready=true` before labels/queue admission.
- Existing WIP/queue caps, parked work, original-chat repairs, owner labels,
  default-off Stripe and human final review/merge remain. No routing/recovery
  installation, new scheduler, issue reassignment or automatic merge is implied.

Restoring Claude requires an explicit owner decision and a coordinated update to
reviewer selection, readiness checks and installed automation policy. Availability
alone does not automatically revert this temporary policy.

## Owner-approved issue queue transfer — 2026-11-04

Vlad subsequently requested moving all Claude-labeled issues to `ready-for-agent`.
The eight open issues observed at transfer were #651, #696, #777, #805, #844,
#845, #870 and #887. Their Claude ownership labels were replaced with
`agent:codex` and `ready-for-agent`; other labels and assignees were preserved.
Closed issues and PR provenance were not relabeled.

Read live GitHub before acting. For these explicit transfers, the current Codex
ownership label supersedes historical Claude allocation prose/claim comments.
It does not clear `blocked`, unresolved dependencies or an existing claim/PR,
award acceptance, or authorize a parallel implementation. #870 retains PR #880;
#844 retains its published Claude branch and any unpublished work until safely
reconciled. Preserve original work and use the same PR for any authorized repair.
Unknown/running ownership requires reconciliation, never checkout takeover.

The dispatcher must reconcile existing transferred claims under WIP=1 before new
pickup. The transfer does not activate the uninstalled native routing/recovery
classifier; any future installation must reconcile these transferred identities
and branch provenance before dispatch. A legacy branch remains evidence of who
implemented it for review independence and protected-path checks.
