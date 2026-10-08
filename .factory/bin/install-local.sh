#!/bin/sh
# Installs the Claude routine's local guards on the Mac mini. Vlad runs this
# himself (agents may not change their own settings) from a checkout of main:
#
#   sh .factory/bin/install-local.sh
#
# Re-run it after a merged change to .factory/hooks, .factory/bin/run-lock.sh or
# .factory/settings, and after adding the optional repo-only token.
# It copies the reviewed files to stable places outside the repo, merges the
# routine settings into ~/Documents/agent-Commerce/.claude/settings.local.json
# (keeping approvals already saved there), and points the folder's git at the
# gh credential helper only.

set -eu

repo=$(git rev-parse --show-toplevel)
# The overrides exist for .factory/bin/install-local.test.sh only.
folder=${CLAUDE_INSTALL_FOLDER:-/Users/work/Documents/agent-Commerce}
share=${CLAUDE_INSTALL_SHARE:-/Users/work/.local/share/agent-commerce}
gh_dir=${CLAUDE_INSTALL_GH_DIR:-/Users/work/.config/gh-agent-commerce-claude}
settings="${folder}/.claude/settings.local.json"

mkdir -p "${share}/hooks" "${share}/bin" "${share}/claude/locks" "${folder}/.claude"
cp "${repo}/.factory/hooks/bash-guard.mjs" "${share}/hooks/bash-guard.mjs"
cp "${repo}/.factory/bin/run-lock.sh" "${share}/bin/claude-run-lock"
chmod 755 "${share}/bin/claude-run-lock"
echo "installed guard hook and run lock in ${share}"

# The repo-only token is optional for now (Vlad, 2026-10-07): without it the
# folder uses Vlad's existing gh login. Once the token's gh configuration
# exists, re-running this script points the folder's gh and git at it.
new=$(cat "${repo}/.factory/settings/routine.settings.local.json")
if [ -f "${gh_dir}/hosts.yml" ]; then
  new=$(printf '%s' "${new}" | jq --arg dir "${gh_dir}" '.env.GH_CONFIG_DIR = $dir')
  use_token=yes
  echo "repo-only token found: gh and git in ${folder} use ${gh_dir}"
else
  use_token=no
  echo "no repo-only token (${gh_dir}/hosts.yml): gh and git in ${folder} use your existing gh login"
fi

if [ -f "${settings}" ]; then
  cp "${settings}" "${settings}.bak"
  # Keep saved approvals and other env values. Without the token, drop only the
  # GH_CONFIG_DIR this installer manages (left by an earlier token install).
  printf '%s' "${new}" | jq -s --arg dir "${gh_dir}" --arg token "${use_token}" '
    (.[0].permissions.allow // []) as $saved
    | .[0] * .[1]
    | .permissions.allow = (($saved + (.permissions.allow // [])) | unique)
    | if $token == "no" and .env.GH_CONFIG_DIR == $dir then del(.env.GH_CONFIG_DIR) else . end
    | if .env == {} then del(.env) else . end
  ' "${settings}.bak" - >"${settings}"
  echo "merged routine settings into ${settings} (previous copy: settings.local.json.bak)"
else
  printf '%s\n' "${new}" | jq . >"${settings}"
  echo "wrote ${settings}"
fi

git -C "${folder}" config --local --replace-all credential.helper ''
git -C "${folder}" config --local --add credential.helper '!gh auth git-credential'
echo "git in ${folder} now asks only gh for GitHub credentials"
