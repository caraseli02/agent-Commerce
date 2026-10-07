#!/bin/sh
# Tests for run-lock.sh. Run: sh .factory/bin/run-lock.test.sh
# Uses a temporary lock root and fake holder processes; never touches the real lock.

set -u
here=$(cd "$(dirname "$0")" && pwd)
LOCKSH="${here}/run-lock.sh"
root=$(mktemp -d)
export CLAUDE_LOCK_ROOT="${root}"
lock="${root}/claude-routine"
fails=0

check() {
  if [ "$2" = "$3" ]; then echo "ok   - $1"; else
    echo "FAIL - $1 (expected '$3', got '$2')"
    fails=$((fails + 1))
  fi
}

token_of() { sed -n 's/^LOCK_TOKEN=//p'; }

live_holder() {
  sleep 600 >/dev/null 2>&1 &
  echo $!
}

# Takes the lock as run "$1" from a holder process, then kills that process
# (a crashed or app-quit run).
crashed_run() {
  sleep 600 >/dev/null 2>&1 &
  p=$!
  CLAUDE_LOCK_HOLDER_PID=${p} sh "${LOCKSH}" acquire "$1" | token_of
  kill "${p}"
  wait "${p}" 2>/dev/null
}

reset() {
  rm -rf "${root}"
  mkdir -p "${root}"
}

# 1. Free lock is taken.
reset
alive=$(live_holder)
out=$(CLAUDE_LOCK_HOLDER_PID=${alive} sh "${LOCKSH}" acquire run-1)
check "free lock is taken" "$?" 0
t1=$(printf '%s\n' "${out}" | token_of)
check "acquire prints a token" "$([ -n "${t1}" ] && echo yes)" yes

# 2. A live holder makes a second run yield, without touching the lock.
CLAUDE_LOCK_HOLDER_PID=$$ sh "${LOCKSH}" acquire run-2 >/dev/null
check "live holder: contender yields" "$?" 3
check "live holder: owner unchanged" "$(sed -n 's/^token=//p' "${lock}/owner")" "${t1}"

# 3. Release with someone else's token leaves the lock.
sh "${LOCKSH}" release not-my-token >/dev/null
check "foreign release keeps the lock" "$([ -d "${lock}" ] && echo kept)" kept

# 4. Release with the right token removes it.
sh "${LOCKSH}" release "${t1}" >/dev/null
check "own release removes the lock" "$([ -d "${lock}" ] && echo kept || echo gone)" gone
kill "${alive}" 2>/dev/null

# 5. A stopped holder is recovered, and its late release cannot remove the successor's lock.
reset
t_old=$(crashed_run crashed-run)
alive=$(live_holder)
out=$(CLAUDE_LOCK_HOLDER_PID=${alive} sh "${LOCKSH}" acquire successor)
check "stopped holder: lock recovered" "$?" 0
t_new=$(printf '%s\n' "${out}" | token_of)
sh "${LOCKSH}" release "${t_old}" >/dev/null
check "old run's release keeps the successor's lock" "$(sed -n 's/^token=//p' "${lock}/owner")" "${t_new}"
check "recovered owner file is archived" "$(ls "${root}/recovered" | wc -l | tr -d ' ')" 1
kill "${alive}" 2>/dev/null

# 6. Many contenders on one stale lock: exactly one ends up holding it.
for round in 1 2 3 4 5; do
  reset
  crashed_run crashed-run >/dev/null
  alive=$(live_holder)
  for i in 1 2 3 4 5 6 7 8; do
    (CLAUDE_LOCK_HOLDER_PID=${alive} sh "${LOCKSH}" acquire "contender-${i}" >"${root}/out.${i}" 2>&1) &
  done
  wait_for=8
  while [ "$(ls "${root}"/out.* 2>/dev/null | wc -l | tr -d ' ')" -lt "${wait_for}" ]; do sleep 0.1; done
  sleep 1
  winners=$(cat "${root}"/out.* | grep -c '^LOCK_HELD=yes')
  check "round ${round}: one winner among 8 contenders" "${winners}" 1
  owner_token=$(sed -n 's/^token=//p' "${lock}/owner")
  winner_token=$(cat "${root}"/out.* | token_of)
  check "round ${round}: winner owns the lock" "${owner_token}" "${winner_token}"
  check "round ${round}: no recovery guard left" "$([ -d "${lock}.recover" ] && echo left || echo none)" none
  kill "${alive}" 2>/dev/null
done

# 7. Unknown or half-written state yields to a human.
reset
mkdir "${lock}"
sh "${LOCKSH}" acquire run >/dev/null
check "lock without owner file: yield" "$?" 3
printf 'token=x\nstarted=now\nwho=old\npid=none\npid_start=none\n' >"${lock}/owner"
sh "${LOCKSH}" acquire run >/dev/null
check "holder that cannot be checked: yield" "$?" 3
check "holder that cannot be checked: lock kept" "$(sed -n 's/^token=//p' "${lock}/owner")" x
reset
crashed_run crashed-run >/dev/null
mkdir "${lock}.recover"
sh "${LOCKSH}" acquire run >/dev/null
check "leftover recovery guard: yield" "$?" 3

# 8. Without an override, the holder is the nearest "claude" ancestor or none.
reset
sh "${LOCKSH}" acquire plain-shell >/dev/null
pid=$(sed -n 's/^pid=//p' "${lock}/owner")
valid=no
if [ "${pid}" = none ] || [ "${pid}" -gt 1 ] 2>/dev/null; then valid=yes; fi
check "holder pid detected or none (${pid})" "${valid}" yes

rm -rf "${root}"
if [ "${fails}" -eq 0 ]; then echo "run-lock: all tests passed"; else
  echo "run-lock: ${fails} failed"
  exit 1
fi
