#!/bin/sh
# Tests for install-local.sh against temporary folders (never the real ones).
# Run from the repo root: sh .factory/bin/install-local.test.sh
set -u
repo=$(git rev-parse --show-toplevel)
root=$(mktemp -d)
export CLAUDE_INSTALL_FOLDER="${root}/folder" CLAUDE_INSTALL_SHARE="${root}/share" CLAUDE_INSTALL_GH_DIR="${root}/gh"
settings="${CLAUDE_INSTALL_FOLDER}/.claude/settings.local.json"
git init -q "${CLAUDE_INSTALL_FOLDER}"
fails=0
check() {
  if [ "$2" = "$3" ]; then echo "ok   - $1"; else
    echo "FAIL - $1 (expected '$3', got '$2')"
    fails=$((fails + 1))
  fi
}
install() { (cd "${repo}" && sh .factory/bin/install-local.sh >/dev/null); }

# 1. Fresh install without the optional token: existing login, no override.
install
check "fresh: sandbox on" "$(jq -r '.sandbox.enabled' "${settings}")" true
check "fresh: guard hook registered" "$(jq -r '.hooks.PreToolUse | length' "${settings}")" 1
check "fresh: no GH_CONFIG_DIR" "$(jq -r '.env.GH_CONFIG_DIR // "unset"' "${settings}")" unset
check "fresh: lock installed" "$([ -x "${CLAUDE_INSTALL_SHARE}/bin/claude-run-lock" ] && echo yes)" yes
check "fresh: git asks only gh" "$(git -C "${CLAUDE_INSTALL_FOLDER}" config --local --get-all credential.helper | tail -n 1)" '!gh auth git-credential'

# 2. Token added, saved approval and an unrelated env value present: token used.
mkdir -p "${CLAUDE_INSTALL_GH_DIR}" && : >"${CLAUDE_INSTALL_GH_DIR}/hosts.yml"
jq '.permissions.allow += ["Bash(saved:*)"] | .env.FOO = "bar"' "${settings}" >"${settings}.tmp" && mv "${settings}.tmp" "${settings}"
install
check "token: GH_CONFIG_DIR set" "$(jq -r '.env.GH_CONFIG_DIR' "${settings}")" "${CLAUDE_INSTALL_GH_DIR}"
check "backup kept outside the folder" "$(ls "${CLAUDE_INSTALL_SHARE}/backups" | wc -l | tr -d ' ')" 1
check "no backup inside the folder" "$(ls "${CLAUDE_INSTALL_FOLDER}/.claude" | grep -c bak)" 0
check "token: saved approval kept" "$(jq -r '.permissions.allow | index("Bash(saved:*)") != null' "${settings}")" true

# 3. Token removed and reinstalled: the managed override goes, the rest stays.
rm "${CLAUDE_INSTALL_GH_DIR}/hosts.yml"
install
check "reinstall without token: override removed" "$(jq -r '.env.GH_CONFIG_DIR // "unset"' "${settings}")" unset
check "reinstall without token: other env kept" "$(jq -r '.env.FOO' "${settings}")" bar
check "reinstall without token: saved approval kept" "$(jq -r '.permissions.allow | index("Bash(saved:*)") != null' "${settings}")" true

# 4. A GH_CONFIG_DIR the installer does not manage is left alone.
jq '.env.GH_CONFIG_DIR = "/somewhere/else"' "${settings}" >"${settings}.tmp" && mv "${settings}.tmp" "${settings}"
install
check "foreign GH_CONFIG_DIR kept" "$(jq -r '.env.GH_CONFIG_DIR' "${settings}")" /somewhere/else

# 5. Without any env value left, the env key disappears.
jq 'del(.env.FOO) | .env.GH_CONFIG_DIR = $d' --arg d "${CLAUDE_INSTALL_GH_DIR}" "${settings}" >"${settings}.tmp" && mv "${settings}.tmp" "${settings}"
install
check "empty env removed" "$(jq -r 'has("env")' "${settings}")" false

# 6. Installs in the same second keep every earlier snapshot (Codex, #615).
before=$(ls "${CLAUDE_INSTALL_SHARE}/backups" | wc -l | tr -d ' ')
jq '.env.FOO = "original"' "${settings}" >"${settings}.tmp" && mv "${settings}.tmp" "${settings}"
install
jq '.env.FOO = "second"' "${settings}" >"${settings}.tmp" && mv "${settings}.tmp" "${settings}"
install
after=$(ls "${CLAUDE_INSTALL_SHARE}/backups" | wc -l | tr -d ' ')
check "back-to-back installs: one new backup each" "$((after - before))" 2
check "back-to-back installs: first snapshot kept" "$(cat "${CLAUDE_INSTALL_SHARE}"/backups/* | grep -c '"original"')" 1
check "back-to-back installs: second snapshot kept" "$(cat "${CLAUDE_INSTALL_SHARE}"/backups/* | grep -c '"second"')" 1

rm -rf "${root}"
if [ "${fails}" -eq 0 ]; then echo "install-local: all tests passed"; else
  echo "install-local: ${fails} failed"
  exit 1
fi
