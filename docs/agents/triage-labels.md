# Triage labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Operational labels (not triage roles)

- `in-progress` — claimed by the planner/generator loop; used by pickup rules in `issue-tracker.md`. If an open PR exists, WIP remains occupied until evaluator pass, blocker, or repair on that same PR.
- `blocked` — concrete blocker found by generator or evaluator; include a comment with the repair instruction or human decision needed

Optional future label:

- `ready-for-evaluator` — use only if the repo adopts an explicit evaluator queue. Until then, evaluators discover open PRs linked to `in-progress` issues, and evaluator failures repair the same issue/branch rather than re-entering `ready-for-agent`.

## Rule

Do not create duplicate labels with slightly different names. Reuse these exact strings.
