#!/bin/sh
# Installs the Claude routine's local guards on the Mac mini. Vlad runs this
# himself (agents may not change their own settings) from a checkout of main:
#
#   sh .factory/bin/install-local.sh
#
# Re-run it after a merged change to .factory/hooks, .factory/bin/run-lock.sh or
# .factory/settings, and once more after storing the routine's GitHub token.
# It copies the reviewed files to stable places outside the repo, merges the
# routine settings into ~/GIT/agent-Commerce/.claude/settings.local.json
# (keeping approvals already saved there), and points the folder's git at the
# gh credential helper only.

set -eu

repo=$(git rev-parse --show-toplevel)
folder=/Users/work/GIT/agent-Commerce
share=/Users/work/.local/share/agent-commerce
gh_dir=/Users/work/.config/gh-agent-commerce-claude
settings="${folder}/.claude/settings.local.json"

mkdir -p "${share}/hooks" "${share}/bin" "${folder}/.claude"
cp "${repo}/.factory/hooks/bash-guard.mjs" "${share}/hooks/bash-guard.mjs"
cp "${repo}/.factory/bin/run-lock.sh" "${share}/bin/claude-run-lock"
chmod 755 "${share}/bin/claude-run-lock"
echo "installed guard hook and run lock in ${share}"

new=$(cat "${repo}/.factory/settings/routine.settings.local.json")
if [ -f "${gh_dir}/hosts.yml" ]; then
  new=$(printf '%s' "${new}" | jq --arg dir "${gh_dir}" '.env.GH_CONFIG_DIR = $dir')
  echo "routine token found: gh and git in ${folder} will use ${gh_dir}"
else
  echo "no routine token yet (${gh_dir}/hosts.yml): gh keeps using your own login until you add it and re-run"
fi

if [ -f "${settings}" ]; then
  cp "${settings}" "${settings}.bak"
  printf '%s' "${new}" | jq -s '
    (.[0].permissions.allow // []) as $saved
    | .[0] * .[1]
    | .permissions.allow = (($saved + (.permissions.allow // [])) | unique)
  ' "${settings}.bak" - >"${settings}"
  echo "merged routine settings into ${settings} (previous copy: settings.local.json.bak)"
else
  printf '%s\n' "${new}" | jq . >"${settings}"
  echo "wrote ${settings}"
fi

git -C "${folder}" config --local --replace-all credential.helper ''
git -C "${folder}" config --local --add credential.helper '!gh auth git-credential'
echo "git in ${folder} now asks only gh for GitHub credentials"
