# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `caraseli02/agent-Commerce`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

`gh` infers the repo from `git remote` when run inside this clone.

## Pickup rules

- The controller loop should behave like a standing `/goal`: keep one issue alive until evaluator pass, blocker, or human intervention.
- Only bounded executable issues with `ready-for-agent` and no unresolved capability dependencies are eligible. Issues labeled `epic` are tracking parents: never claim them, label them ready-for-agent/in-progress, or count them in WIP.
- Before editing code, the planner claims exactly one issue:
  - remove `ready-for-agent`
  - add the `in-progress` label
  - assign the issue to the working account
  - leave a short comment with the branch name
- If an issue is already assigned or already has an active PR, skip it.
- WIP is 1 per builder: never claim two executable issues for the same builder. Claude owns issues labeled `agent:claude`; Codex skips `agent:claude` and owns other eligible issues. Delegated models share the builder's existing claim. GitHub labels, assignments and linked PRs are the live authority; unattended agents do not update shared tracking snapshots.
- Claude never claims `area:payments` issues or anything in the payment map below.
- The generator may only implement the issue already claimed by the planner.
- The generator opens or updates one PR intended to complete the executable issue. It uses `Closes #<child>` and `Related #<epic>`, but does not declare final completion. Anonymous partial slices cannot keep extending one executable issue; rescope into named children before implementation.
- If the builder's `in-progress` issue has an open PR, do not select new work. Wait for evaluator, or repair that same PR when the evaluator fails it.
- The evaluator independently checks the PR and moves the issue toward `ready-for-human` only after evidence passes.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Suggested issue body

Each issue should include:

- problem statement
- acceptance criteria
- verification command
- evaluator expectations: evidence the evaluator must check before marking review-ready
- notes about mock/live mode if relevant

## PR body requirement

Every generator PR should include:

- Executable issue and `Closes #<issue>`; use `Related #<epic>` for a tracking parent
- Verification evidence from local pre-flight checks, including exact command outcomes
- Runtime/browser evidence when UI, route, auth, cart, checkout, mock API, or state flow changed, with links or paths to the exact proof
- Risks, known failures, or explicit `none`

If a PR uses temporary evidence artifacts during review, the PR body should say where they live and whether they will be removed before merge.

The evaluator report is separate from the generator PR body and should use `docs/agents/autonomous-workflow.md`.

## Claim comment example

`Claimed by agent-Commerce loop on branch feat/123-short-slug`

## Epic and dependency contract

A tracking epic has a fixed child checklist and a closure condition. Native GitHub sub-issues represent parentage; native blocked-by relationships plus explicit capability notes represent prerequisites. A child has one observable outcome, fixed acceptance criteria, verification, and exclusions, normally delivered through one PR. Dependency edges must be acyclic and refer to capabilities rather than requiring an entire epic that consumes the child.

Evaluator PASS means the executable child criteria are complete. An epic closes only when its fixed child checklist and declared integration evidence are complete. New unrelated findings become separate backlog issues; do not silently grow either checklist. Update both dependency bodies and native edges when rescoping.

Payment map: #557 tracks #584/#585/#588; #558 tracks #586/#587. #585 needs the recorded commercial selection policy before pickup; #587 depends on #586; #588 depends on #585/#586/#587. #556 requires #584/#588 and merged backend resume; #559 requires the completed UI and named compensation capabilities. #583 tracks existing state/error contract cleanup. Stripe activation stays off until #559 Gate A passes.
