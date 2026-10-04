#!/bin/bash
# SessionStart hook for Claude Code cloud sessions.
# Provisions the toolchain CI uses (Node 24, pnpm 10.18.3, PostgreSQL) so
# `pnpm lint|typecheck|test|verify` work without manual setup.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

NODE_MAJOR=24
PNPM_VERSION=$(node -p "require('./package.json').packageManager.split('@')[1]" 2>/dev/null || echo 10.18.3)
NODE_DIR="$HOME/.local/node$NODE_MAJOR"
DB_URL="postgresql://postgres:postgres@127.0.0.1:5432/ecas_test"

log() { printf '[session-start] %s\n' "$*" >&2; }

# 1. Node 24 (package.json engines). nodejs.org is blocked by the egress proxy,
#    so pull the official binary from the npm registry package instead.
if [ ! -x "$NODE_DIR/bin/node" ] || [ "$("$NODE_DIR/bin/node" -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]; then
  log "Installing Node $NODE_MAJOR into $NODE_DIR"
  tmp=$(mktemp -d)
  (cd "$tmp" && npm pack "node-linux-x64@$NODE_MAJOR" --silent >/dev/null)
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xzf "$tmp"/node-linux-x64-*.tgz -C "$NODE_DIR" --strip-components=1 package
  rm -rf "$tmp"
fi
export PATH="$NODE_DIR/bin:$PATH"

# 2. pnpm pinned by packageManager.
if [ "$(pnpm --version 2>/dev/null || true)" != "$PNPM_VERSION" ] || [ "$(command -v pnpm)" != "$NODE_DIR/bin/pnpm" ]; then
  log "Installing pnpm $PNPM_VERSION"
  npm install -g --silent "pnpm@$PNPM_VERSION" --prefix "$NODE_DIR" >/dev/null
fi

# 3. PostgreSQL for checkout persistence and the isolated test-schema wrapper
#    (mirrors the CI postgres service).
if command -v pg_isready >/dev/null && ! pg_isready -q -h 127.0.0.1 -p 5432; then
  log "Starting PostgreSQL"
  service postgresql start >/dev/null
  for _ in $(seq 1 20); do pg_isready -q -h 127.0.0.1 -p 5432 && break; sleep 0.5; done
fi
if pg_isready -q -h 127.0.0.1 -p 5432; then
  su postgres -c "psql -qtAc \"ALTER USER postgres PASSWORD 'postgres'\"" >/dev/null
  su postgres -c "psql -qtAc \"SELECT 1 FROM pg_database WHERE datname='ecas_test'\"" | grep -q 1 ||
    su postgres -c "createdb ecas_test"
else
  log "WARNING: PostgreSQL is not available; DB-backed tests will fail"
fi

# 4. Persist environment for the session's Bash tool.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo "export PATH=\"$NODE_DIR/bin:\$PATH\""
    echo "export DATABASE_URL=\"\${DATABASE_URL:-$DB_URL}\""
    echo "export PLAYWRIGHT_BROWSERS_PATH=\"\${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}\""
  } >>"$CLAUDE_ENV_FILE"
fi
export DATABASE_URL="${DATABASE_URL:-$DB_URL}"

# 5. Dependencies (install, not frozen ci, so the cached container is reused).
[ -f .env ] || cp .env.example .env
log "Installing dependencies"
pnpm install --frozen-lockfile --prefer-offline

# 6. Apply checkout schema to the dev database.
pnpm db:migrate >/dev/null || log "WARNING: pnpm db:migrate failed"

# 7. Playwright browsers. cdn.playwright.dev is blocked, so when the pinned
#    @playwright/test build is missing fall back to the preinstalled Chromium.
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -x /opt/pw-browsers/chromium ] &&
  ! node -e "require('fs').accessSync(require('playwright-core').chromium.executablePath())" 2>/dev/null; then
  echo 'export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-/opt/pw-browsers/chromium}"' >>"$CLAUDE_ENV_FILE"
fi

log "Ready: node $(node --version), pnpm $(pnpm --version)"
