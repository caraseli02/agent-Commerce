#!/usr/bin/env bash
# Run ONLY in a disposable trusted Ubuntu ARM64 image-build VM, never on macOS
# or a PR checkout. Image assembly itself is deliberately not a privileged host installer.
set -euo pipefail
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
test "$(id -u)" = 0
test -x /usr/local/bin/node
test "$(/usr/local/bin/node --version)" = v24.11.0
test "$(/usr/local/bin/pnpm --version)" = 10.18.3
test -f /trusted-main/pnpm-lock.yaml
test -f /trusted-release/guest-run.mjs
test -x /usr/lib/postgresql/17/bin/postgres
id ci >/dev/null 2>&1 || useradd --system --create-home --home-dir /ci --shell /usr/sbin/nologin ci
passwd -l ci
install -d -m 0755 /opt/local-ci /ci-input
install -m 0644 /trusted-release/guest-run.mjs /opt/local-ci/guest-run.mjs
install -m 0644 /trusted-release/deploy/local-ci.service /etc/systemd/system/local-ci.service
install -m 0644 /trusted-release/deploy/local-ci.target /etc/systemd/system/local-ci.target
systemctl mask ssh.service ssh.socket serial-getty@hvc0.service serial-getty@hvc1.service
systemctl start postgresql
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ci LOGIN PASSWORD 'ci' CREATEDB;"
runuser -u postgres -- createdb -O ci ci
install -d -o ci -g ci /opt/ci-store
cd /trusted-main
# Trusted reviewed main only; download its exact locked packages while assembling.
runuser -u ci -- /usr/bin/env HOME=/ci PATH=/usr/local/bin:/usr/bin:/bin pnpm fetch --frozen-lockfile --store-dir=/opt/ci-store
systemctl stop postgresql
# The runtime image must have no owner credentials, sudo grants, guest root
# login, production URLs or mounted image-build directories. Check before export.
test ! -e /ci/.ssh
test ! -e /root/.ssh
test ! -e /ci/.config/gh
printf '%s\n' 'Image preparation complete; cold boot + network/credential probes and disk export still required.'
