# Standalone local CI: audit and proposed design

Observed 2026-10-16, Europe/Madrid. Status: investigation/design complete enough for owner review; implementation, installation and activation have not begun. This proposal replaces the hosted-runner direction, not the independent review requirement. No GitHub Actions, paid runners or re-enablement are required by the proposed service.

## 1. Observed infrastructure

| Layer                 | Observation                                                                                                                                              | Consequence                                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub                | Actions permissions API returns `enabled: false`                                                                                                         | CI, PR-template and Owner attention workflows cannot execute.                                                                                                                              |
| GitHub                | Branch-protection API returns 403: upgrade to Pro or make repository public                                                                              | Current repository plan cannot enforce required checks this way. A human can still merge manually; Phase 2 must fail closed in local readiness logic. Rulesets were not separately tested. |
| PR 728                | Open, head `b8adf3915a3dbfdf5b4af71f7bc9fc8bac799a5c`, base `adcba1f96e09a32e0d72dde686af97d5572b801f`; Vercel success, required Actions evidence absent | Neither Vercel nor historical local gates establishes standalone CI.                                                                                                                       |
| Host                  | ARM64, 17,179,869,184 bytes RAM, 8 logical CPUs; Data volume reports 30 GiB available                                                                    | One VM/job, strict storage and memory limits; avoid simultaneous heavy builder verification where possible.                                                                                |
| Tools                 | Node 24.11.0, pnpm 10.18.3, PostgreSQL 17.11; `pg_isready` accepting                                                                                     | Reuse versions/conventions, never reuse the host database for untrusted execution.                                                                                                         |
| Docker                | Desktop 4.16.2; CLI 20.10.22; default and desktop-linux endpoints both unavailable                                                                       | Installed application is not usable worker evidence. No Docker startup was attempted.                                                                                                      |
| Docker saved settings | 4 CPUs, 8,092 MiB RAM, approximately 60 GiB virtual disk; file sharing includes `/Users`, `/Volumes`, `/private`, `/tmp`, `/var/folders`                 | Do not adopt this personal Docker environment for untrusted PR execution. Settings describe configuration, not current consumption.                                                        |
| Isolation tools       | No `limactl`, Tart, Podman, Colima or QEMU executable found in current PATH                                                                              | Proposed dedicated VM environment is not deployed.                                                                                                                                         |
| Identities            | Directory lookup found neither `agent-commerce-ci` nor `github-notifications`                                                                            | Separate CI identity requires owner/admin setup.                                                                                                                                           |
| Services              | PostgreSQL LaunchAgent loaded; Docker helper entry exists; no dedicated local-CI plist in inspected user LaunchAgents or system LaunchDaemons            | No standalone CI service has been demonstrated. Other users' service domains were not exhaustively audited.                                                                                |
| GitHub credentials    | Existing owner keyring login works; broad `repo` OAuth access plus unrelated scopes                                                                      | Adequate for current read-only audit, unsuitable as the deployed CI identity. No token was extracted, changed or copied.                                                                   |

### Claude: repository versus installed state

Repository `.factory/factory.yaml` defines one Claude routine, build mode, hourly 09:00–19:00 Madrid, fresh worktrees, owner labels, protected paths and independent cross-review. `.factory/bin/run-lock.sh` uses a token/process-aware local lock. Installed `~/.local/share/agent-commerce/bin/claude-run-lock` and hook directory exist. These are orchestration guards, not an isolation boundary for CI.

Installed `~/.claude/scheduled-tasks/claude-routine/SKILL.md` checks the shared Git directory and a `.claude/worktrees/` checkout, then reads the routine from `origin/main`. A legacy `pr-evaluator/SKILL.md` also remains on disk and references retired `~/GIT/` paths. Its presence does not prove it is scheduled or active. The Claude Desktop schedule/permission UI was not inspected; the documented schedule is not claimed as verified deployed schedule state.

### Codex: installed state

Installed settings enable native builder/reviewer execution, app-chat mode and one chat per issue. Its process-held lease and registered-command helper serialize configured Codex runs, not arbitrary processes or Claude. The installed workflows contain the temporary disabled-Actions policy.

Actual saved automation files differ from older README prose: the active dispatcher is every two hours at :00 and the active cross-review automation is hourly at :30. This audit read their saved TOML fields, not runtime scheduler execution. No automation was changed. CI must not acquire the AI lease or use either AI scheduler to wake itself.

### Existing verification and notification code

- `scripts/verify.mjs` runs build, bundle budget, lint, typecheck, PostgreSQL-backed coverage, feature-list and UI convention checks. Full mode adds architecture invariants and fresh preview smoke. Documentation classification and receipt reuse exist; independent CI must disable reuse and choose the full gate for Phase 1.
- `scripts/with-test-database.mjs` provides PostgreSQL test schemas. Keep this behavior inside a disposable guest-local PostgreSQL instance, with no host or production connection available.
- `scripts/check-pr-template.mjs` exports `assessPrTemplate`: reuse this trusted implementation against current GitHub body/labels. Do not run a PR-modified checker with coordinator credentials.
- `scripts/owner-attention.mjs` currently requires the `verify` check run; its helpers also inspect combined statuses, independent exact-head verdicts, mergeability, change requests, protected paths and queue state. Its notifier assumes `github-actions[bot]`. Running it unchanged under the owner's token would not preserve notification behavior.
- Existing application and workflow tests are valuable regression evidence. Existing builder hooks remain mandatory, but neither hooks nor an agent's local result replace independent CI.

## 2. Recommended architecture

```text
GitHub REST API <-> trusted Node coordinator + SQLite + publication outbox
                              |
                         one durable job
                              |
                    restricted VM supervisor
                              |
               disposable ARM64 Linux guest per job
               source + Node/pnpm + PostgreSQL 17
                              |
                  exit outcome + bounded log stream
                              |
                  teardown confirmed by supervisor
                              |
                 GitHub local-ci/verify status
```

Use Node 24 and SQLite, with explicit transactions, WAL, durable synchronization, schema migrations and an exclusive coordinator process lock. Keep trusted deployed code outside every source checkout. Never auto-update it from a PR, or execute PR-owned code on the host, including package-manager hooks, Git hooks, Git configuration, or result parsers. The service has no LLM dependency.

Poll open PRs and their exact heads/base tips about every 60 seconds with pagination, rate-limit backoff and jitter. Include human, Claude and Codex PRs; author/label does not exempt a PR. Include drafts for verification, but never infer readiness from them. Also reconcile metadata edits and persisted jobs. Manual `request --pr N` resolves live GitHub state; a forced retry creates a new attempt, not another simultaneous worker. A manual raw-SHA diagnostic cannot establish PR integration readiness without a base context.

### Durable identity and queue behavior

Job identity: repository + PR number + head SHA + base ref + current base-tip SHA + verification-policy digest + worker-image digest. Policy digest covers trusted coordinator/runner version, gate definition and metadata-validator version. Separate PR associations may reuse identical computation only when all execution inputs match; metadata validation remains per PR.

Store immutable attempts and transitions: queued, preparing, running, cleaning, succeeded, failed, errored, superseded. Terminal success is committed only after verified cleanup. Jobs include source/object digests, synthetic merge SHA, PR metadata digest, timestamps, worker identity, exit outcome and complete bounded logs. New head/base/policy supersedes obsolete queued jobs. Prioritize current PR contexts with FIFO aging to prevent starvation. A running obsolete job receives bounded termination and cleanup; it cannot publish success as current evidence.

One full job at a time is enforced by both SQLite transaction ownership and the supervisor's OS process lock. Avoid a time-only lease that could launch a second worker while an old VM survives. On startup, reconcile recorded worker identities against actual owned VM processes/disks. Unknown or surviving execution blocks dispatch until terminated and cleanup proved. Queued work survives restart; interrupted running attempts become infrastructure errors and get a fresh attempt after cleanup. Never adopt their previous success/output.

### Head, integration and metadata evidence

Resolve live head and base-tip objects, fetch them using trusted transport and verify object identities. Test a deterministic synthetic merge of the head into that base; conflicts produce explicit failure. Preserve history needed by verification. The head SHA remains the GitHub status target, while the tested merge/base/policy are recorded in coordinator-owned evidence. Base movement creates a new context even when the head is unchanged.

Before final publication, refresh the PR head, base ref/tip and metadata. A head change supersedes evidence; a base change requires new integration verification. A body/label edit invalidates/recomputes trusted template validation without necessarily rerunning unchanged application checks. Never use a historic green status alone for acceptance. During GitHub outages, freshness cannot be confirmed and acceptance is unknown.

GitHub commit status `local-ci/verify` is a visible summary, not a sufficient base-aware attestation. Include a short base/policy identifier and attempt identifier in its description; keep complete evidence in the durable database and a trusted metadata report. Phase 2 readers must validate current head/base/policy and trusted publication identity, not just the context name. A base can move between API calls: there is no atomic compare-and-publish status API. Periodic reconciliation and a fresh fail-closed readiness read are mandatory; do not claim zero-latency revocation.

## 3. Execution boundary and credentials

Recommend a maintained Lima/VZ ARM64 Linux guest, cloned from a pinned, patched trusted image for each attempt, controlled by a dedicated standard macOS account. Lima is a candidate requiring validation, not presently established isolation. Its normal convenience mounts/networking must not be accepted as safe defaults.

- No host filesystem shares, host home, SSH agent forwarding, Docker socket, clipboard integrations or guest-to-host credential channels. No inherited host environment or copied `.env*`/Git credentials. Transfer source through a narrow stream/archive channel with traversal/symlink protections; no host-side extraction of untrusted archives.
- Separate coordinator credential identity from the VM supervisor identity. The supervisor has no GitHub publishing credential; its interface accepts only validated job IDs and bounded inputs, never arbitrary host shell commands or host paths. Root-owned service code/configuration prevents PRs or routine accounts from replacing trusted execution code. The normal owner still has administrative authority; this design does not protect against a malicious host administrator.
- A GitHub App installation scoped to this repository is preferable: Contents read, Pull requests read, Commit statuses write, Metadata read. Phase 2 may separately add Issues write for trusted evidence/notifications and review reads as needed. Short-lived installation tokens remain only with the coordinator. A repository-scoped fine-grained token is an alternative, but provides weaker identity separation when also owned by the builder account. The existing broad owner login is not the deployment credential.
- Private source is fetched by the coordinator, then transferred without its credential. Private registry dependencies, if discovered, require a separate design; never pass repository tokens into installation.
- All install scripts and tests execute only in the disposable guest. Use Node 24.11.0/pnpm 10.18.3 initially, pinned image/package digests, PostgreSQL 17, mock mode, mock payment provider, Stripe activation false, and only guest-local database credentials. Guest database superuser access cannot reach any host/Neon/production database.
- Network: deny host, host gateway, private/LAN, link-local, metadata, IPv6 equivalents and unrelated services. Package downloads use a trusted restricted egress path with redirect/DNS-rebinding controls. Tests run with external egress disabled, retaining guest loopback PostgreSQL and preview access. A guest-controlled firewall alone is insufficient if PR code can gain guest root. Enforcement must live outside the untrusted guest execution context. No direct GitHub write access from the guest.
- Lima plain mode disables mounts and SSH-agent forwarding, but does not by itself establish network isolation. A proof must probe host services, gateway aliases, IPv4/IPv6, LAN, DNS and credential canaries from malicious install scripts and tests. Hypervisor/kernel vulnerabilities remain residual platform risk; maintained software and image updates are required.
- Destroy the VM and writable disk after every attempt; verify no owned processes, disks or transient credentials remain. Failed deletion, timeout, crash or uncertain identity becomes error and blocks the worker, never success. Do not delete unrelated VMs or host files to recover.

**Current activation blocker:** no available validated disposable runtime or separate CI identity. The saved personal Docker setup is not an acceptable substitute. If host-enforced egress isolation cannot be achieved without security changes the owner rejects, alternatives are an offline prehydrated image containing all locked dependencies (unknown dependency changes fail closed) or a separate physical host/network. Do not silently use unrestricted NAT or host execution.

## 4. Verification and trustworthy reporting

Inside the guest: frozen-lockfile dependency installation followed by `pnpm verify:full --fresh` (reusing the existing pipeline, including its full-mode architecture/preview gates). Initially omit `--base` so Phase 1 always runs the full application gate; no documentation-only optimization and no local receipt reuse. Keep coverage thresholds, PostgreSQL/payment regressions and UI conventions. Never overwrite macOS visual baselines with Linux output. Independent UI review remains separate.

Trusted coordinator validates live PR metadata using the deployed template checker and combines that outcome with worker exit status and cleanup evidence. Never parse a PR-controlled JSON file or log line saying PASS as authoritative success. A PR can still modify its own tests or verification scripts; preserve independent review/protected-path approval, record the exact verified policy/scripts, and flag such changes for review. CI proves configured checks ran, not that a malicious test suite is comprehensive.

Use a transactional publication outbox: enqueue intended pending/success/failure/error with immutable attempt identity in the same transaction as state changes. Pending covers queued/running. Test/merge/template failure means failure; unavailable isolation/authentication/cleanup/infra means error. Auth failures cannot publish an error without working credentials: persist it, surface local health, and retry after recovery.

Before retrying a lost API response, query the latest context status and reconcile against intended attempt/state/description. GitHub statuses are append-only and lack exactly-once idempotency, so transport duplicates are possible; require convergence without replaying stale success over a newer pending/error. Serialize publication for each head/context and suppress obsolete outbox records. Bound retries, respect rate limits and the API status-count limit. Never let API failure convert unknown into success.

Complete logs mean all captured output for an accepted bounded job. Proposed limits: one VM, 4 vCPUs, 6 GiB guest RAM, 45-minute timeout, 12 GiB writable guest disk, 100 MiB logs/job, 30-day or 100-attempt history, 2 GiB total logs. Log overflow terminates with error rather than silently truncating a successful run. Reserve 10 GiB host free space; insufficient capacity blocks new jobs. With only 30 GiB currently free, actual image plus writable-disk budgets must be measured before accepting these proposed limits. Prune only owned terminal data; never delete queued jobs or unsent outbox evidence.

## 5. Repeatable Phase 1 acceptance tests

Unit tests alone are insufficient. Provide subprocess-level coordinator tests with persistent on-disk SQLite and a deterministic fake GitHub HTTP server, plus real disposable-VM proofs and a watched GitHub canary. Use malicious fixtures only inside that boundary.

| Scenario                        | Required observation                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Claude, Codex and human PRs     | Same discovery and independent gate, no author-specific exemptions.                          |
| Duplicate polling/manual events | One computation per context; bounded manual retries are explicit attempts.                   |
| Several PRs                     | One live worker, durable ordered queue, current-head priority without starvation.            |
| New head/branch replacement     | Old queued attempt superseded; older success cannot satisfy new head.                        |
| Main/base ref changes           | Same head gets pending/new verification; old integration evidence rejected.                  |
| Queued restart                  | Kill/restart coordinator process against same disk; jobs retained exactly.                   |
| Crash during execution/cleanup  | Surviving VM reconciled/removed; no overlapping second worker; unknown cleanup blocks.       |
| Lost publication response       | Fake API accepts POST then drops connection; recovery converges without stale result replay. |
| Tests fail                      | GitHub failure for exact requested head, full logs retained, cleanup confirmed.              |
| GitHub unavailable/rate limited | Queue retained, bounded backoff, no false green or fresh-readiness claim.                    |
| Missing/revoked credentials     | Health error and retained outbox; no secret in worker or logs.                               |
| PR body/label edit              | Fresh template outcome; old metadata result not accepted.                                    |
| Forged result/status            | Guest output cannot publish; Phase 2 rejects wrong publisher/policy/context.                 |
| Host/credential escape probes   | Canary files, agent homes, SSH keys, Docker sockets, host DB and LAN cannot be reached.      |
| Install-script attack           | Same isolation/egress guarantees apply before any test starts.                               |
| Log/disk/time limit             | Explicit infrastructure error and verified teardown.                                         |
| Reboot                          | Actual watched reboot retains queued jobs, startup resumes, no orphan worker overlaps.       |

Real evidence required before activation acceptance: at least one repository PR verification in the guest with PostgreSQL, exact merge/head/base recording, GitHub pending then final status, forced failure, cleanup proof, service restart, and actual reboot. Simulated restart tests must not be described as a Mac reboot. None of these standalone-CI execution proofs exists yet.

## 6. Deployment/update/rollback plan

Phase 1 PR must supply a versioned installer, validation commands, launchd plist templates and exact version-specific commands. An executable admin runbook cannot be honestly finalized before the runtime/version and account arrangement are approved and tested.

Proposed installation layout: root-owned read-only releases under `/Library/Application Support/agent-commerce-ci/releases/<digest>`; writable queue/logs in a coordinator-owned data directory; disposable VM state in a distinct supervisor-owned directory. Dedicated standard accounts cannot read the owner's home/agent credentials. Verify actual POSIX/ACL access; account separation by name alone is insufficient. Store the App key outside VM-accessible directories and plist environment variables. Do not grant sudo, Full Disk Access or SSH access to personal keys.

Use launchd with RunAtLoad, KeepAlive, backoff/throttle, absolute executable paths and restricted identities. Prove VZ availability in the intended launchd domain on this Mac before selecting a system LaunchDaemon: a per-user LaunchAgent may require login and does not prove unattended pre-login recovery. FileVault cold boot may require owner unlock. Do not disable FileVault or change power/security settings automatically. If the selected runtime cannot meet the startup requirement, document that limitation and revisit deployment before activation.

Owner/admin steps to be generated in Phase 1: create the two standard service identities and ACLs; install the approved virtualization runtime and egress enforcement; install root-owned release/plists; create/install repository-scoped App credentials; validate configuration; bootstrap the service; run watched malicious-isolation/canary/reboot checks. No privileged install, account creation or service activation is authorized by this design review alone.

Updates are explicit reviewed releases, atomically selected only while idle; pin runtime/image/policy digests. Back up SQLite consistently before schema migration. Rollback stops dispatch, cleans/records active execution, restores a compatible release/database backup or fails closed on incompatible schema, and republishes pending/error for untrusted evidence. Stopping local CI must never fall back to assumed green Actions or permit automatic readiness. Phase 2 must reject an unavailable/stale CI health state.

## 7. Two reviewable implementation phases

**Phase 1: standalone service.** One explicitly bounded human-authorized issue and separate PR from main; independent coordinator, durable queue/outbox, disposable worker, template validation, status publication, operations/runbook and acceptance tests above. No evaluator/queue-readiness policy migration. Do not claim a second autonomous issue while #720 remains active; explicitly supersede/park its old implementation claim when the owner validates this replacement scope. Do not close or merge PR 728. Existing acceptance remains blocked until Phase 2 has established a new reviewed contract.

**Phase 2: only after Phase 1 review and merge.** Separate issue/PR updates Claude routine/evaluator, Codex deployed source/instructions, readiness and queue helpers, protected harness rules, and Owner Attention. Require independently published current head + current base + approved policy/image evidence, independent exact-head evaluator PASS, known acceptable mergeability, no outstanding change requests, and required owner authorization. Do not rely on Actions `verify` or `check`.

Run Owner Attention from trusted local service code, with durable deduplication/outbox and restart coverage. A repository-scoped GitHub App bot can produce distinct-actor notices; prove notification delivery to the owner. Provide a native local notification/health channel for GitHub outages. Do not use owner-account self-mentions as notification proof. Reuse pure policy helpers after tests; do not simply run the existing Actions entry point under a personal token. Manual merging remains possible without server enforcement; state this clearly.

Bootstrap review of Phase 1 must be explicit: independent local review plus owner decision about its own CI service deployment, not a builder self-approval or fabricated hosted pass. Phase 2 starts only after the owner reviews and merges Phase 1.

## 8. Recommendation for PR 728

Leave it open and unmerged pending owner disposition. Recommend superseding its self-hosted Actions rollout once the standalone Phase 1 PR exists; do not extend it into the standalone service PR.

- Retain the measured audit, distinction between runtime and billing, dedicated-identity/security lessons, and temporary outage guidance until a reviewed replacement is active.
- Preserve workflow predicate/concurrency tests as evidence of their original scope; they do not validate standalone CI. Selectively retain only tests relevant to any workflow changes actually kept.
- The disabled runner probe and Actions-specific installation/cutover plan are unnecessary for the selected architecture. Do not activate them.
- PR concurrency and comment filtering can remain optional future hosted optimizations, but do not spend migration effort or make local CI depend on them. Trusted-template checkout is sound hardening if the dormant workflow is retained.
- Adapt the disabled-Actions policy in Phase 2; do not merge an instruction that requires hosted checks to return as the long-term acceptance contract.

No merge, closure, labels, queue claims, schedules, credentials, host security settings or installed services were changed during this audit.

## Decisions for the owner

1. Validate the proposed dedicated coordinator + disposable Lima/VZ guest architecture, with activation blocked until external network isolation and cleanup are proved. Approve Phase 1 implementation as the replacement scope while preserving PR 728 for disposition.
2. Choose GitHub App identity (recommended) versus a repository-scoped token with its documented weaker publisher separation. Creating credentials requires owner action; do not reuse the personal broad token by default.
3. At the later concrete deployment review, approve exact account/service/egress setup commands and any necessary storage allocation. No privileged or host-wide security change precedes that approval.

## Primary references

- GitHub commit status API and token permissions: https://docs.github.com/en/rest/commits/statuses#create-a-commit-status
- Lima security model and residual risks: https://lima-vm.io/docs/security/
- Lima plain-mode behavior: https://lima-vm.io/docs/config/plain/
- Lima mount configuration: https://lima-vm.io/docs/config/mount/
- Lima default networking: https://lima-vm.io/docs/config/network/user/
- Docker Desktop settings and resource/file-sharing controls: https://docs.docker.com/desktop/settings-and-maintenance/settings/

Audit command logs (local, not proof of implementation):

- `/Users/work/.local/share/agent-commerce/autonomy/native/commands/e0ef6715c8b34c69ae14532bf8ff19f5.log` — current PR, Actions disabled, protection 403.
- `/Users/work/.local/share/agent-commerce/autonomy/native/commands/47c9c18730e64fcb92a98c1e6a240290.log` — toolchain, first Docker endpoint, resources, existing auth.
- `/Users/work/.local/share/agent-commerce/autonomy/native/commands/79dcdfde91284291888f0279b9d2ebe4.log` — second Docker endpoint, disk, identities, services.
