# Temporary separate Codex review — owner decision, 2026-11-03

Claude PR review is unavailable. Vlad selected a separate Codex reviewer for
Codex-built PRs. This takes precedence over older opposite-builder/Claude-only
review requirements until Vlad explicitly restores or replaces it. The existing
Codex reviewer also continues reviewing Claude-built PRs; ownership labels and
Claude's build queue do not transfer to Codex.

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
