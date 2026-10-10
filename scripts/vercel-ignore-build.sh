#!/usr/bin/env bash
# Vercel Ignored Build Step (vercel.json "ignoreCommand").
# Exit 0 = skip this deployment (Vercel marks it Canceled), exit 1 = build it.
#
# A push is skipped only when nothing that reaches the build output changed
# since this branch's last successful deployment (VERCEL_GIT_PREVIOUS_SHA).
# A branch's first deployment, a base missing from Vercel's shallow clone, or
# any git error builds, so every branch still gets a preview.
#
# chart-designs/ is deliberately NOT excluded: ProgressBar.vue imports it.
set -u

BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$BASE" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  echo "No previous deployment to compare with - building."
  exit 1
fi

git diff --quiet "$BASE" HEAD -- . \
  ':(exclude)docs/**' ':(exclude)tests/**' ':(exclude)skills/**' \
  ':(exclude).factory/**' ':(exclude).claude/**' ':(exclude).agents/**' ':(exclude).codex/**' \
  ':(exclude).github/**' ':(exclude).husky/**' ':(exclude).vscode/**' \
  ':(exclude)*.md' ':(exclude)feature_list.json' ':(exclude)skills-lock.json' ':(exclude).visual-impact.json' \
  ':(exclude)playwright*.config.ts' ':(exclude)vitest.config.ts' ':(exclude)eslint.config.mjs' \
  ':(exclude).prettierrc' ':(exclude).prettierignore' ':(exclude).lintstagedrc' ':(exclude).worktreeinclude'
status=$?

if [ "$status" -eq 0 ]; then
  echo "Only docs/tests/harness files changed since $BASE - skipping."
  exit 0
fi
if [ "$status" -eq 1 ]; then
  echo "App files changed since $BASE - building."
  exit 1
fi
echo "git diff failed ($status) - building to be safe."
exit 1
