# CI cost reduction and notifications runner rollout (#720)

This change reduces redundant hosted work and stages a Mac mini probe. Production
`CI`, `Owner attention`, and `PR template` remain on `ubuntu-latest`. No runner has
been registered, no host service installed, and no production cutover performed.
The probe is disabled until `NOTIFICATIONS_RUNNER_PROBE_ENABLED=true` is explicitly
set by the owner after the prerequisites below. It is not a required check.

## Baseline observed on 2026-10-16

GitHub REST queries used the existing login, the UTC creation window
`2026-10-01..2026-10-15`, and all pages (100 runs/page) of each workflow's `/runs`.
These are workflow executions, **not charged minutes**. They supersede the earlier
issue's partial-window counts for this particular query; they do not establish a
billing increase.

| Workflow        | Executions | Success | Failure | Cancelled | Skipped |
| --------------- | ---------: | ------: | ------: | --------: | ------: |
| Owner attention |        786 |     532 |       0 |       178 |      76 |
| PR template     |        359 |     261 |      28 |        70 |       0 |
| CI              |        229 |     226 |       2 |         1 |       0 |

Owner events: 283 issue comments, 205 workflow completions, 198 issue changes,
89 PR target events and 11 scheduled runs. PR template: 359 PR target events.
CI: 154 PR events and 75 main pushes. A skipped workflow need not allocate a
runner; cancellation may happen before or after allocation. Do not price all
executions as completed jobs. The historical irrelevant-comment fraction is unknown.

| Successful sample                                                                                 | Job wall time | Observed steps                                                                            |
| ------------------------------------------------------------------------------------------------- | ------------: | ----------------------------------------------------------------------------------------- |
| [Owner run 38815489208](https://github.com/caraseli02/agent-Commerce/actions/runs/38815489208)    |          24 s | checkout 2 s, Node setup 13 s, reconcile 4 s                                              |
| [Template run 38797394119](https://github.com/caraseli02/agent-Commerce/actions/runs/38797394119) |           9 s | checkout 2 s, Node setup 3 s, checker 1 s                                                 |
| [CI run 38814870031](https://github.com/caraseli02/agent-Commerce/actions/runs/38814870031)       |         313 s | PostgreSQL 29 s, checkout 6 s, pnpm setup 1 s, Node/cache 8 s, install 11 s, Verify 252 s |

The CI job log separates Verify into approximately build 65.8 s, bundle check
0.3 s, lint 18.5 s, typecheck 32.2 s and coverage 132.9 s (boundaries include
command startup). Its client build was 15.9 s and server build 10.7 s; remaining
build time includes Nitro/output work. This is one hosted sample, not a benchmark
of every build. Existing pnpm caching, frozen installation, PostgreSQL services,
fresh CI verification, coverage and payment regressions are retained. This evidence
does not justify weakening coverage, splitting verification or caching build output.

Billing observations:

- Account `/users/caraseli02/settings/billing/usage?year=2026&month=10`,
  `/usage/summary?year=2026&month=10`, and legacy `/settings/billing/actions`
  returned HTTP 404; gh reported missing `user` scope. Authentication was not
  changed. Actual allowance consumption and distribution across other repositories
  are **unavailable**, not zero. The owner's 100% report remains owner-reported.
- All three sample `/actions/runs/<id>/timing` responses returned
  `billable.UBUNTU.total_ms=0` despite nonzero job times. Record the API values as
  observed; they cannot establish account charges or justify claiming free usage.
- Repository is private, default branch `main`. Runner inventory returned
  `total_count=0`. Branch protection lookup returned 403 (Pro/public required),
  so enforced required-check configuration could not be established. Preserve
  existing workflow/job identities: `CI / verify` and `PR template / check`.
- Main [CI run 38907774850](https://github.com/caraseli02/agent-Commerce/actions/runs/38907774850)
  on 2026-10-16 failed before starting. Its check annotation says recent account
  payments failed or the spending limit must be increased. This confirms a hosted
  billing/spending block, not its exact allowance percentage. Local passing tests
  cannot substitute for the missing hosted check.
- `billed_minutes_before=null`, `billed_minutes_after=null`,
  `observed_monthly_savings=null`, `model_usage=null`.

## Trigger and concurrency changes

| Workflow        | Admission and work                                                                                                                                                                                                                                                         | Supersession / loops                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner attention | Existing PR target/review, issue label/state, CI/template completion, dispatch and schedule remain. PR comments run only when the current **or previous edited body** contains `## Evaluator verdict`; bot comments and ordinary discussion skip before runner allocation. | Repository-wide group, `cancel-in-progress: false`; every admitted job still reconciles **all live state**. Its notices do not retrigger it. It does not watch its own workflow completion. |
| PR template     | Existing open/edit/synchronize/reopen/label/ready events remain; fetch current PR metadata using trusted default-branch checker.                                                                                                                                           | Existing per-PR cancellation retained. No label-based job skip that could replace a required failure with success.                                                                          |
| CI              | PR commits and main pushes retain every existing gate.                                                                                                                                                                                                                     | Per-PR group cancels superseded commits. Main uses unique run ID groups and never cancels main verification.                                                                                |
| Probe           | Owner dispatch on default branch, enabled variable only.                                                                                                                                                                                                                   | Separate serial group, five-minute job timeout, no required-check identity.                                                                                                                 |

The comment expression is admission, not evaluator validation: the unchanged
script rechecks trusted authors, explicit attribution, exact head, contradictory
verdicts, live checks, reviews and mergeability. It accepts both modern and legacy
markers. Edited/retracted reports still reconcile; ordinary discussion may be
repaired by the hourly sweep. Blocked labels, protected-path approval labels and
workflow completions retain immediate triggers. The **existing** cron
`20 7-19 * * *` (hourly during its current UTC window) is unchanged; it was not a
24-hour schedule. Label fan-out remains conservative because labels affect queue,
provenance, blockers and template exemptions.

No incremental event-only reconciliation or dedupe mutation occurs before a
notification is posted. A pending run replaced by GitHub therefore loses no state:
the next admitted run reads everything, and the hourly sweep repairs missed
signals. Running reconciliations are not cancelled. Keep the full reconciliation
if changing concurrency; event-only work would need durable pending-event storage.

## Security and activation prerequisites (owner only)

A runner label is routing, not a security boundary. A default-branch checkout in
these workflows does not stop a different PR workflow from requesting the same
persistent runner. Before registration, prove that **only allowlisted trusted
workflow definitions on main** can use the runner. Record that access policy and
test a PR-head runner request is denied without executing it. Personal repository
runners have no organization workflow allowlist. If that restriction cannot be
provided on the current account, leave this stage disabled and hosted; an isolated
trusted automation repository or organization workflow-restricted runner group
needs a separate reviewed owner decision. Do not buy infrastructure or move the
repository to make this PR appear activated. Fork approval settings and a probe's
`if` expression alone do not satisfy this prerequisite.

Use a dedicated **standard**, non-admin macOS account `github-notifications`.
It must have no access to the builder's home, Codex/Claude stores, keychain,
Git/SSH credentials, cloud credentials, database sockets, Stripe keys or internal
network services. Verify OS file permissions and network isolation as that user;
an account name and a passing connectivity probe alone cannot prove isolation.
No sudo rights, Full Disk Access, reusable PAT, owner login or deployment secrets.
The audited machine currently runs as `work`; Directory Services reported
`eDSRecordNotFound` for `github-notifications`. Account creation and isolation
require the Mac administrator; this PR does not alter host accounts/permissions.

After access isolation is proven, as the owner:

1. In macOS System Settings → Users & Groups, create the standard account above.
   Log into it once; install official ARM64 Node 24 into `/usr/local/bin` (or set
   its explicit path in the service). Verify `id -un`, `id -Gn`, `uname -m` and
   `node --version`. Do not source the developer's `env.sh` or `.env.local`.
2. In the approved GitHub runner target's Settings → Actions → Runners → New
   self-hosted runner, select **macOS / ARM64**. Use the exact current download
   URL and SHA-256 verification command shown there; unpack only the verified
   official archive into `/Users/github-notifications/actions-runner`. Do not use
   an arbitrary “latest” download or copy a developer's runner directory.
3. As `github-notifications`, in that directory, register using the short-lived
   token from the approved target's UI (never commit it or enable shell tracing):

   ```bash
   umask 077
   read -r -s RUNNER_REGISTRATION_TOKEN
   ./config.sh --url https://github.com/caraseli02/agent-Commerce \
     --token "$RUNNER_REGISTRATION_TOKEN" \
     --name mac-mini-notifications --labels mac-mini-notifications --work _work
   unset RUNNER_REGISTRATION_TOKEN
   ```

   The repository URL above applies **only if its access restriction has been
   proved**; otherwise do not run it. A separately approved organization target
   uses its own URL and restricted group. Default labels supply `self-hosted`,
   `macOS`, `ARM64`; confirm all four in the API. Leave automatic runner updates
   enabled. Restrict runner-directory access to that account (`chmod 700`).

4. Test foreground `./run.sh`, then stop it before installing a service. The
   official macOS `./svc.sh install` / `start` / `status` manage a launch agent;
   verify actual login/reboot behavior rather than assuming it starts before login.
   For unattended boot, the administrator may install this explicit LaunchDaemon
   as `/Library/LaunchDaemons/com.agent-commerce.notifications-runner.plist`:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0"><dict>
     <key>Label</key><string>com.agent-commerce.notifications-runner</string>
     <key>UserName</key><string>github-notifications</string>
     <key>WorkingDirectory</key><string>/Users/github-notifications/actions-runner</string>
     <key>ProgramArguments</key><array><string>/Users/github-notifications/actions-runner/runsvc.sh</string></array>
     <key>EnvironmentVariables</key><dict><key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
     <key>RunAtLoad</key><true/>
     <key>KeepAlive</key><true/>
     <key>ThrottleInterval</key><integer>30</integer>
     <key>StandardOutPath</key><string>/Users/github-notifications/actions-runner/service.log</string>
     <key>StandardErrorPath</key><string>/Users/github-notifications/actions-runner/service-error.log</string>
   </dict></plist>
   ```

   Install/run **one** service mechanism, never both. For the boot daemon, after
   saving the file as administrator:

   ```bash
   sudo chown root:wheel /Library/LaunchDaemons/com.agent-commerce.notifications-runner.plist
   sudo chmod 644 /Library/LaunchDaemons/com.agent-commerce.notifications-runner.plist
   plutil -lint /Library/LaunchDaemons/com.agent-commerce.notifications-runner.plist
   sudo launchctl bootstrap system /Library/LaunchDaemons/com.agent-commerce.notifications-runner.plist
   sudo launchctl print system/com.agent-commerce.notifications-runner
   ```

   The daemon runs `runsvc.sh` as the standard account, never root. Keep FileVault
   enabled: a physical cold boot may still require an owner unlock. Verify online
   status after reboot and document that operational prerequisite.

5. After this PR is merged, inspect the reviewed probe on main, then use:

   ```bash
   gh api repos/caraseli02/agent-Commerce/actions/runners
   gh variable set NOTIFICATIONS_RUNNER_PROBE_ENABLED --body true
   gh workflow run notifications-runner-probe.yml --ref main
   gh run list --workflow notifications-runner-probe.yml --limit 3
   gh run watch <probe-run-id> --exit-status
   ```

   Require runner `online`, expected labels, a successful named probe, fresh Node
   24, non-admin identity, and verified access isolation. Repeat after service
   restart and reboot. Queued/disabled/skipped is **not** readiness. Disable the
   variable after proof. Do not dispatch repeatedly when offline: job timeout does
   not bound GitHub's wait for a runner.

6. Before any production cutover, run the reviewed default-branch notification
   script once with `OWNER_ATTENTION_DRY_RUN=1` and only a job-scoped token, inspect
   proposed notices, then test actual bot notices/dedupe on a controlled PR/issue.
   Use the workflow's existing contents/checks/statuses reads and issues/PR writes;
   expose the token only to the notifying step, never interpolate PR text into shell.
   Pin checkout/setup actions to reviewed immutable SHAs for persistent execution;
   disable credential persistence and check out main only. Install no dependencies
   from PR branches, download no PR artifacts, and execute no PR-head code.
7. Submit the small cutover diff with recorded probe/boot/access evidence. Change
   Owner attention first; preserve its job identity, triggers, serial group and
   script. Keep `PR template / check` hosted until notification reliability is
   proved. A later template cutover must retain that exact identity and current
   metadata fetch. Application CI remains hosted throughout. Neither cutover is
   activated by this PR or by setting the probe variable.

## Outage, recovery and rollback

Keep runner updates enabled; inspect `_diag/Runner_*.log`, `_diag/Worker_*.log`,
service logs and runner version after updates. Rotate logs under the dedicated
account without reading developer files. For the launch agent use `./svc.sh status`,
`stop`, `start`; for the boot daemon use `sudo launchctl print
system/com.agent-commerce.notifications-runner` and `sudo launchctl kickstart -k
system/com.agent-commerce.notifications-runner`. Restart only while idle; running
notifications must finish their read/post transaction. Stop the service and remove
registration through GitHub if compromise is suspected; rebuild the runner account
before reusing it. Do not reuse its credentials elsewhere.

Before cutover, an offline Mac affects only the optional probe; all production jobs
remain hosted. After an approved cutover, lack of an online runner queues jobs and
may delay notices/checks indefinitely. Do not call queued checks green. The owner
must revert `runs-on` for affected jobs to `ubuntu-latest` using the saved cutover
commit (normal reviewed push), cancel obsolete queued runs, then dispatch
`owner-attention.yml` on main for a full repair sweep. Rerun the affected PR-template
check after hosted routing is restored, preserving `PR template / check`; never
remove it from requirements to escape an outage. Hosted rollback still needs
available billing allowance; if exhausted, report the blocker rather than promise
immediate recovery. Disable the probe with:

```bash
gh variable set NOTIFICATIONS_RUNNER_PROBE_ENABLED --body false
```

For boot-service removal, administrator runs `sudo launchctl bootout
system/com.agent-commerce.notifications-runner`, then removes only that reviewed
plist; for a launch agent use `./svc.sh stop` and `./svc.sh uninstall` as the runner
account. Remove registration via the runner Settings UI. Retain no registration
or job tokens in evidence.

## Cost comparison after rollout

Owner must export the account's Actions usage report from Billing for the before
and after windows, retaining date, repository, SKU/OS, quantity, discounts and net
charge. Aggregate account usage across repositories first, then this repo; workflow
job durations only explain allocation when the ledger lacks workflow detail.
Keep unknown workflow attribution explicit instead of dividing account totals by
run count. The three read-only billing endpoints above can be retried with an
owner-provided authorized report/access; this change does not expand token scopes.

Compare equal weekday/activity windows and report hosted billable minutes/day,
PR/main counts, cancellations before/after allocation, and actual notice latency.
Hourly/event notices must be checked during rollout; watch failures and queued jobs
in Actions as part of that watched rollout. No additional scheduler is installed.

Projection only: if all 532 successful owner jobs in this 15-day sample each cost
one rounded Linux minute, moving them would avoid about `532 / 15 * 31 ≈ 1,100`
gross hosted minutes/month. Adding 261 successful template jobs gives another
`261 / 15 * 31 ≈ 539`. These are scenario estimates, **not ledger savings**;
failures/cancellations, discounts, actual billability and workload growth are
unmodeled. Comment filtering alone avoids `ordinary allocated comments/day ×
rounded job minutes × days`; that fraction is not measured, so no numeric saving
is asserted. Do not add filtering savings to a full workflow migration estimate.
CI concurrency savings likewise require observing overlapping superseded PR jobs;
main verification costs are intentionally retained. Actual post-rollout comparison
remains pending owner activation and an observation window.

## Verification and sources

`tests/ci-cost-workflows.spec.ts` evaluates the actual owner job expression across
ordinary discussion, modern/legacy verdicts, edits/retractions and bot feedback;
it also checks hosted routing, unchanged cron, PR/main concurrency and staged
probe boundaries. Existing owner-attention integration tests exercise live-state
readiness, blocked and protected-path notices, duplicate runs, stale heads,
contradictions and queue repair. No application/UI consumers change.

Primary references checked 2026-10-16:

- [GitHub runner security](https://docs.github.com/en/actions/reference/security/secure-use): persistent hosts must be isolated from untrusted code.
- [Runner group workflow access](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/manage-access): enforce trusted workflow access rather than relying on labels.
- [Official runner registration](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners): obtain the platform-specific release and short-lived registration instructions.
- [Official service setup](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application): service lifecycle and custom `runsvc.sh` entry point.
- [Billing API](https://docs.github.com/en/rest/billing/usage): account usage differs from workflow execution duration.
