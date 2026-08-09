#!/usr/bin/env bash
set -euo pipefail

INSTALL_CMD=${INSTALL_CMD:-"pnpm install --frozen-lockfile"}
VERIFY_CMD=${VERIFY_CMD:-"pnpm build && pnpm lint && pnpm typecheck && pnpm test"}
START_CMD=${START_CMD:-"pnpm dev"}

printf 'Components Marketplace initialization\n'
printf 'Repository: %s\n' "$(pwd)"
printf 'Node: %s\n' "$(node --version 2>/dev/null || echo 'missing')"
printf 'pnpm: %s\n' "$(pnpm --version 2>/dev/null || echo 'missing')"
printf '\nInstall command: %s\n' "$INSTALL_CMD"
bash -lc "$INSTALL_CMD"

printf '\nVerification command: %s\n' "$VERIFY_CMD"
bash -lc "$VERIFY_CMD"

printf '\nBaseline ready. Start command: %s\n' "$START_CMD"
if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  exec bash -lc "$START_CMD"
fi
