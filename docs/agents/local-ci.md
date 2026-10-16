# Standalone local CI — Phase 1

Owner approved the standalone design on 2026-10-16. Issue #731 replaces #720's selected architecture; PR #728 stays open and unmerged pending owner disposition. GitHub Actions remain disabled. This service does not require Actions, a paid runner, either AI dispatcher, or an LLM.

**Deployment status: disabled, not installed.** Software tests exercise real subprocesses, SQLite and HTTP with a simulated GitHub server/worker. The native VZ helper compiles on the Mac mini. There is no trusted guest image, dedicated service account, GitHub App credential, watched guest execution, live status publication, or reboot proof yet. Do not describe this as operational CI or use it to accept PRs. Phase 2 cannot start until Phase 1 is reviewed and merged.

## Boundary and architecture

The coordinator polls GitHub every approximately 60 seconds, persists jobs/outbox in SQLite and publishes `local-ci/verify`. It obtains a short-lived repository-scoped GitHub App token for Contents read, Pull requests read and Commit statuses write. Only that trusted host process fetches private source and publishes results.

A separately owned supervisor receives validated job identifiers and credential-free Git bundles over a local Unix socket. It creates a disposable disk clone and read-only input ISO, then starts a small signed Apple Virtualization framework helper. The helper has **no network devices, shared directories, socket devices or forwarded agent**. Host files exposed to the guest are exactly the disposable root disk and input image; host paths are never provided by a PR. GitHub credentials, agent homes, personal worktrees and host PostgreSQL never enter the guest. The root image contains a root-owned entry point that runs installation and the existing `pnpm verify:full --fresh` as an unprivileged `ci` user against guest-only PostgreSQL 17.

The architecture audit initially proposed Lima/VZ as a candidate. Investigation showed that Lima plain mode/empty network settings do not remove its default host networking. This implementation uses VZ directly, with no NIC, rather than assuming a network filter is effective. It requires no new hypervisor installation and removes NAT/egress-proxy administration. It adds a small Swift helper, whose compilation/signature validation is recorded separately from boot/isolation proof. No nested virtualization is required on M1.

Dependency installation is **offline** against a store hydrated from a reviewed lockfile in a trusted image-build VM. An unknown dependency/lockfile fails with infrastructure error until an explicitly reviewed image refresh; no fallback network or host install exists. Fonts/build-time external resources must also be available offline or the gate fails. The default image is not downloadable/run-ready: the operator must build, pin and validate it first.

## Queue and evidence contract

- Discovery is author-neutral and paginated. Draft PRs may be verified but CI does not establish readiness. Resolve the current base branch tip through the refs API; a cached pull-request base SHA is insufficient.
- Context identity includes PR number, head, base ref/tip and trusted policy digest. Metadata identity includes body/labels. Identical requests coalesce; metadata edits revalidate the trusted template checker. Successful or failed execution with identical head/base-ref/base-tip/policy can be reused across PR associations for up to 30 days, independently of each PR's metadata. Explicit manual retries bypass that computation cache.
- Only one preparing/running/cleaning row is allowed by SQLite's unique index. The supervisor independently excludes a second worker. Current queued contexts run FIFO; obsolete queued contexts are superseded. A running obsolete job may finish bounded execution, but cannot publish current success; no unsafe host process takeover is attempted.
- States: queued → preparing → running → cleaning → success/failure/error. Superseded work cannot establish current readiness. Success requires supervisor-confirmed teardown. Missing cleanup stays cleaning/error and blocks dispatch.
- WAL and FULL synchronization persist transitions and the status outbox. Queue state survives process restart. After coordinator interruption, the separate supervisor proves cleanup before interrupted attempts become error; an explicit manual retry or a changed context starts another attempt. Queued jobs resume automatically. No time-only worker takeover exists.
- Supervisor crash closes its VZ liveness pipe, terminating the VM process. On restart, recorded PIDs must be gone before disk cleanup. A still-live/reused PID or a launch-before-PID-record crash window fails closed for operator investigation; the service never kills an unknown PID or deletes unrelated state.
- The coordinator tests a synthetic merge of exact head into exact base. The guest reports the merge SHA and outcome on a root-only control serial port, separate from PR stdout/stderr. Its unprivileged commands cannot open `/dev/hvc1`; the image must enforce that property. Forged PASS text in ordinary output has no authority. CI still cannot prove that a PR-modified test suite is comprehensive: independent review and protected-path authorization remain essential.
- Before green publication, refresh every known PR association for the SHA, base and metadata. A SHA shared across PRs is green only if all known current contexts are green. There is no atomic GitHub compare-and-publish operation: base movement can race an API call. Phase 2 must freshly validate the full evidence context and service health, not trust a green status string alone.
- Publication is a durable outbox. On a lost POST response, inspect the latest context status and reconcile attempt/state/description. GitHub has no exactly-once status API; duplicates are possible under remote races, but stale outbox records never intentionally overwrite new context results. No false success on API/auth failure. Missing credentials cannot publish their own error: local health and unsent work persist.
- The status description identifies attempt/base/policy. Full spec, merge, outcome and cleanup evidence live in SQLite and logs. No public log server, upload, or public webhook receiver is introduced. Phase 2 must add trusted evidence transport for independent acceptance; the status alone is insufficient.

## Resource limits and history

One VM, four vCPUs, 6 GiB guest RAM, maximum 12 GiB fixed-size writable disk, 45-minute host timeout (44-minute guest service). Read-only source bundle at most 1 GiB. Combined captured output at most 100 MiB; overflow kills the VM and returns error, rather than presenting truncated success. Host command environments are constructed explicitly; no inherited credentials/proxy variables reach the supervisor/helper.

Queue history retains up to 100 recent terminal attempts/30 days, while preserving current contexts and unsent publications. Supervisor logs have a 2 GiB/30-day/100-attempt bound. These bounds can retain more current database rows for many open PRs; the source/job/worker capacity gates must also pass. Reserve at least 10 GiB host free space before execution; source fetch and VM execution also check available space every second and stop on reserve exhaustion. The reserve is a preflight check, not a filesystem quota; provisioning must place state on a suitably bounded volume and validate worst-case consumption before activation. Image downloads/builds and the active guest plus seed/source/logs can exceed the Mac's presently observed 30 GiB free space. Measure actual image/copy-on-write use; do not promise the current disk is sufficient.

Operator/service error logs need OS log rotation in deployment. Do not enable unbounded verbose logging. Health is saved locally; Phase 2 must notify on service failure and reject stale health.

## Local development checks

```sh
node --test --test-timeout=20000 tests/local-ci.test.mjs
pnpm exec vitest run tests/local-ci.spec.ts
bash scripts/local-ci/deploy/build-helper.sh /private/tmp/local-ci-vm-review
plutil -lint scripts/local-ci/deploy/coordinator.plist scripts/local-ci/deploy/supervisor.plist
```

The helper build refuses to overwrite an existing output. Compilation/signature validation proves use of the installed SDK, not that a guest was booted. Tests use an internal fixture module, not a production fake-worker switch. No GitHub token is needed for those checks. Keep normal hooks and use one `pnpm verify:handoff` for delivery; this change has no application UI consumers.

## Deployment preparation — owner executes after review

The following commands are a concrete proposed deployment recipe, **not authorization to run them now**. Account creation, privileged file ownership, service bootstrap, image installation and watched reboot require the owner's separate approval. No such commands were executed while preparing this PR.

### 1. Prepare reviewed artifacts

Build the helper in the reviewed checkout with the command above. Prepare a signed/digested release containing `scripts/local-ci/` and the unchanged trusted `scripts/check-pr-template.mjs`, plus the compiled helper named `local-ci-vm`. Copy a verified Node 24.11.0 ARM64 runtime into the release staging directory as `runtime/`; do not point launchd at the personal `~/.nvm` runtime. Capture SHA-256 digests of the compiled helper, kernel, initrd and fixed-size raw root disk. Pin the exact release directory in the plists; no mutable `current` symlink is accepted by the immutable-path validator.

Build the guest in a disposable trusted Linux ARM64 image-build environment, with Debian/PostgreSQL 17, Node 24.11.0 and pnpm 10.18.3. The installed kernel/initrd must support virtio block/console and root `/dev/vda`. The root disk must be raw ext4, at most 12 GiB, directly bootable using the documented kernel command line. Creating/formatting such a disk is restricted to the disposable image builder; never run disk-formatting commands against a host device.

Transfer only `git archive` output from the reviewed main commit to `/trusted-main` and reviewed `scripts/local-ci` to `/trusted-release` in that builder. Do not copy the working directory, ignored `.env*`, SSH keys or home caches. Install exact official runtime packages with validated upstream digests in the builder; record OS/kernel/package versions. As root **inside that trusted builder only**, run:

```sh
bash /trusted-release/deploy/prepare-guest.sh
```

The script initializes the disposable test role/database and offline pnpm store. It is intentionally one-time (existing database roles cause failure). Hydrate any additional build caches using reviewed main and guest-local mock configuration, then remove `/trusted-main`, `/trusted-release`, temporary checkouts, host-transfer mounts, credentials, cloud-init login keys, guest sudo/polkit grants and saved environment files before exporting. Keep `/opt/ci-store` and `/ci` accessible only to their intended guest users; `/opt/local-ci`, binaries, units and control device must be root-owned and unmodifiable by `ci`. Confirm no getty on either serial port, no root/ci login mechanism, and no unrelated customer/production data. Capture this inventory with the image digest. A prebuilt image from an unknown source is not accepted as equivalent proof.

### 2. Owner/admin account and directory setup

Choose these account names only after confirming they do not already exist. `sysadminctl -password -` prompts for passwords; do not paste passwords into this chat or command arguments. Accounts stay standard and have no admin/sudo/FDA grants.

```sh
sudo sysadminctl -addUser agentci -fullName 'Agent Commerce CI coordinator' -home /var/empty -shell /usr/bin/false -password -
sudo sysadminctl -addUser agentci-worker -fullName 'Agent Commerce CI worker' -home /var/empty -shell /usr/bin/false -password -
sudo dseditgroup -o create agentci-ipc
sudo dseditgroup -o edit -a agentci -t user agentci-ipc
sudo dseditgroup -o edit -a agentci-worker -t user agentci-ipc
sudo dseditgroup -o create agentci-secrets
sudo dseditgroup -o edit -a agentci -t user agentci-secrets
sudo install -d -o root -g wheel -m 0755 /Library/AgentCommerceCI
sudo install -d -o root -g wheel -m 0755 /Library/AgentCommerceCI/releases /Library/AgentCommerceCI/images
sudo install -d -o agentci -g agentci-ipc -m 0700 /Library/AgentCommerceCI/state /Library/AgentCommerceCI/coordinator
sudo install -d -o agentci-worker -g agentci-ipc -m 0700 /Library/AgentCommerceCI/worker
sudo install -d -o agentci -g agentci-ipc -m 2750 /Library/AgentCommerceCI/transit
sudo install -d -o root -g agentci-ipc -m 2770 /Library/AgentCommerceCI/ipc
sudo install -d -o root -g agentci-secrets -m 0750 /Library/AgentCommerceCI/credentials
```

Install the reviewed release/runtime/images into those directories using absolute paths and root ownership. Root-owned code/config/asset paths and their ancestors must not be group/world writable and must not contain symlinks; `doctor` rejects otherwise. Service data must be on a volume with sufficient reserved capacity/quota. Do not change the owner's home permissions or host-wide security settings to make this work. Validate that the worker account cannot read coordinator state, the App key, agent sessions, SSH keys or personal files. The VM must still have no route to host files even where macOS account permissions are permissive.

### 3. GitHub App and configuration

Owner creates a GitHub App installed only on `caraseli02/agent-Commerce`, with Metadata read, Contents read, Pull requests read and Commit statuses write. No Actions permission, administration permission, workflow scope or repository write access is needed. Store its private key as root-owned `0640`, group `agentci-secrets`, at `/Library/AgentCommerceCI/credentials/app.pem`. Do not use the existing broad owner gh login. The App identity is also useful for trustworthy Phase 2 reporting; issue-write permissions are not requested in Phase 1.

Copy `deploy/config.example.json` to `/Library/AgentCommerceCI/config.json`, root-owned `0644`. Fill App/installation IDs, all exact asset hashes and release paths. Keep `enabled: false` until the operator is ready for the supervised canary. Fill the `RELEASE` placeholders in both plist templates and copy them to `/Library/LaunchDaemons/com.agent-commerce.local-ci.{coordinator,supervisor}.plist`, root-owned `0644`. No token/key belongs in a plist or VM.

### 4. Supervised activation and canary

After explicit owner approval of the concrete staged files, set `enabled: true` in the root-owned configuration and run (replace `RELEASE` with the pinned installed directory):

```sh
sudo -u agentci /Library/AgentCommerceCI/runtime/bin/node /Library/AgentCommerceCI/releases/RELEASE/scripts/local-ci/service.mjs doctor /Library/AgentCommerceCI/config.json
sudo -u agentci-worker /Library/AgentCommerceCI/runtime/bin/node /Library/AgentCommerceCI/releases/RELEASE/scripts/local-ci/service.mjs doctor /Library/AgentCommerceCI/config.json
sudo launchctl bootstrap system /Library/LaunchDaemons/com.agent-commerce.local-ci.supervisor.plist
sudo launchctl bootstrap system /Library/LaunchDaemons/com.agent-commerce.local-ci.coordinator.plist
sudo -u agentci /Library/AgentCommerceCI/runtime/bin/node /Library/AgentCommerceCI/releases/RELEASE/scripts/local-ci/service.mjs request /Library/AgentCommerceCI/config.json PR_NUMBER
sudo -u agentci /Library/AgentCommerceCI/runtime/bin/node /Library/AgentCommerceCI/releases/RELEASE/scripts/local-ci/service.mjs jobs /Library/AgentCommerceCI/config.json
sudo launchctl print system/com.agent-commerce.local-ci.coordinator
sudo launchctl print system/com.agent-commerce.local-ci.supervisor
```

The request argument is a **PR number**, not an issue number: replace `PR_NUMBER` with the actual canary PR number after publication. No current PR number was fabricated here. Validate App API read/status permission first. If system-domain VZ execution is unavailable on this Mac, stop and record the exact error; do not switch silently to a personal login session or disable security controls. FileVault may require unlock after cold boot; do not disable it. Demonstrate actual startup behavior under the intended service account/domain before claiming always-on recovery.

Before trusting the canary, run malicious guest install/test fixtures that try: owner/agent/SSH/key paths; guest serial control write; host loopback/LAN/IPv4/IPv6/DNS/GitHub access; socket access; background processes; timeout, log overflow and disk pressure. Assert rejection/unreachability, final error when appropriate, and no host side effects. Verify guest PostgreSQL state disappears with the disk. Verify pending → success/failure/error on the exact head and current base, and that a new head/base invalidates prior evidence. Perform a real supervisor/coordinator crash, restart and watched Mac reboot with queued work; record timestamps, App status URLs/API results, helper/image/release hashes and cleanup evidence. Do not replace this with unit tests or a fake worker.

## Safe stop, update and rollback

```sh
sudo launchctl bootout system/com.agent-commerce.local-ci.coordinator
```

Stop admission first and wait for the supervisor's bounded running attempt to finish and clean up. Inspect worker health/state and logs; never delete a lock, disk or process record based on age. Then:

```sh
sudo launchctl bootout system/com.agent-commerce.local-ci.supervisor
```

Do not remove the private queue or credential directories. Back up SQLite with its SQLite backup API/CLI while idle (including a consistent WAL checkpoint), then install a new immutable release and regenerate pinned hashes/plist paths. Schema version 1 rejects unknown versions. Restart and prove the same canary checks; a changed release/image changes the policy digest and invalidates prior evidence. Rollback uses the prior compatible release and database backup; incompatible or uncertain state stays stopped. Do not turn Actions on as a fallback or infer acceptance from old green statuses. Phase 2 must treat unavailable/stale service health as blocking.

The manual client is a local socket client, not a scheduler. Existing Claude/Codex automation, leases, schedules and acceptance rules remain unchanged by Phase 1. No additional agent session or background service is activated by the PR.

## Phase 2 and PR #728

After Phase 1 is reviewed and merged, a separate PR must update both evaluators, PR readiness, queue admission and Owner Attention to require current head/base/policy local-CI evidence plus independent evaluator PASS, known acceptable mergeability, no change requests and owner protected-path approval. A visible status context alone is insufficient. Add App-bot/native owner notifications with durable deduplication, and prove delivery; owner-account self-mentions do not work as evidence. The repository's current branch-protection API returns 403 for its plan, so readiness must fail closed while documenting that GitHub may still allow a manual merge.

Recommend superseding PR #728's staged Actions runner/probe and hosted activation plan. Retain useful audit/security findings and selected dormant-workflow hardening only if separately desired. Preserve its tests as historical scoped evidence, not standalone-CI proof. Do not merge or close PR #728 automatically. Its temporary outage guidance remains until a reviewed Phase 2 contract replaces it.

## Primary references

- [GitHub commit statuses and token permissions](https://docs.github.com/en/rest/commits/statuses)
- [GitHub App installation tokens](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app)
- [Apple Linux VM configuration](https://developer.apple.com/documentation/virtualization/running-linux-in-a-virtual-machine)
- [Apple VM shutdown delegate](https://developer.apple.com/documentation/virtualization/vzvirtualmachinedelegate)
- [Lima plain-mode limitations](https://lima-vm.io/docs/config/plain/)
