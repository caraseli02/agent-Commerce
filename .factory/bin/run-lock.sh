#!/bin/sh
# Claude routine run lock (Mac mini only).
#
#   run-lock.sh acquire "<who>"   exit 0 and print LOCK_TOKEN=<token> when this run holds the lock;
#                                 exit 3 when another run holds it (yield: do nothing, never release)
#   run-lock.sh release <token>   remove the lock only if <token> owns it
#   run-lock.sh status            print the owner file and whether its holder is alive
#
# Rules (from Codex's FAIL on #591 at 17f2d631):
# - mkdir (no -p) is the atomic claim; a contender never waits.
# - No age-based takeover. A held lock is recovered only after confirming that
#   its holder process (the Claude Code session that took it) has stopped, and
#   only under a second atomic guard, so two contenders cannot both recover it.
# - A run releases only the lock whose owner token it holds.
# - Anything unexpected (missing owner file, holder that cannot be checked,
#   leftover recovery guard, process inspection that fails) yields and leaves
#   the decision to a human.
# - Release takes the same guard as recovery, so a late release can never
#   remove a successor's lock between its token check and its removal.

set -u

LOCK_ROOT=${CLAUDE_LOCK_ROOT:-/Users/work/.local/share/agent-commerce/claude/locks}
LOCK="${LOCK_ROOT}/claude-routine"
GUARD="${LOCK}.recover"

# The Claude Code process that runs this session: the nearest ancestor whose
# executable is named "claude". Shell state does not persist between tool
# calls, so this process, not the shell, stays alive for the whole run.
holder_pid() {
  if [ -n "${CLAUDE_LOCK_HOLDER_PID:-}" ]; then
    echo "${CLAUDE_LOCK_HOLDER_PID}"
    return
  fi
  pid=$$
  while [ -n "${pid}" ] && [ "${pid}" -gt 1 ]; do
    comm=$(ps -o comm= -p "${pid}" 2>/dev/null) || break
    case "${comm##*/}" in claude)
      echo "${pid}"
      return
      ;;
    esac
    pid=$(ps -o ppid= -p "${pid}" 2>/dev/null | tr -d ' ')
  done
  echo none
}

# Prints the start time of process $1, or nothing when ps cannot report it.
proc_start() {
  out=$(ps -o lstart= -p "$1" 2>/dev/null) || return 1
  printf '%s' "${out}" | sed 's/^ *//;s/ *$//'
}

field() { sed -n "s/^$1=//p" "$2" 2>/dev/null | head -n 1; }

# Prints alive, dead or unknown for the owner file $1. Only a confirmed
# absence ("No such process") or a confirmed different start time (reused PID)
# counts as dead; any inspection failure is unknown, and unknown always yields.
holder_state() {
  pid=$(field pid "$1")
  start=$(field pid_start "$1")
  case "${pid}" in '' | none | *[!0-9]*)
    echo unknown
    return
    ;;
  esac
  if [ -z "${start}" ] || [ "${start}" = none ]; then
    echo unknown
    return
  fi
  if kill -0 "${pid}" 2>/dev/null; then
    now=$(proc_start "${pid}") || now=
    if [ -z "${now}" ]; then
      echo unknown
    elif [ "${now}" = "${start}" ]; then
      echo alive
    else
      echo dead
    fi
    return
  fi
  err=$(LC_ALL=C kill -0 "${pid}" 2>&1)
  case $(printf '%s' "${err}" | tr '[:upper:]' '[:lower:]') in
    *"no such process"*) echo dead ;;
    *) echo unknown ;;
  esac
}

# Recovery and release both run under this second atomic guard, so a release's
# token check and removal cannot interleave with a recovery.
take_guard() {
  tries=${CLAUDE_LOCK_GUARD_TRIES:-20}
  while [ "${tries}" -gt 0 ]; do
    if mkdir "${GUARD}" 2>/dev/null; then return 0; fi
    tries=$((tries - 1))
    [ "${tries}" -gt 0 ] && sleep 0.5
  done
  return 1
}

write_owner() {
  pid=$(holder_pid)
  start=none
  if [ "${pid}" != none ]; then start=$(proc_start "${pid}"); fi
  {
    echo "token=$1"
    echo "started=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "who=$2"
    echo "pid=${pid}"
    echo "pid_start=${start:-none}"
  } >"${LOCK}/owner.tmp" && mv "${LOCK}/owner.tmp" "${LOCK}/owner"
}

held() {
  echo "Claude routine: $1"
  echo "LOCK_HELD=yes"
  echo "LOCK_TOKEN=$2"
  exit 0
}

yield() {
  echo "Claude routine: $1"
  echo "LOCK_HELD=no"
  exit 3
}

acquire() {
  who=${1:-unnamed run}
  token=$(uuidgen 2>/dev/null || echo "$(date +%s).$$")
  mkdir -p "${LOCK_ROOT}" || {
    echo "Claude routine: cannot create ${LOCK_ROOT}"
    exit 1
  }

  if mkdir "${LOCK}" 2>/dev/null; then
    write_owner "${token}" "${who}"
    held "lock taken" "${token}"
  fi

  owner="${LOCK}/owner"
  [ -f "${owner}" ] || yield "lock exists without an owner file (a run may be starting); a human removes ${LOCK} after checking that no Claude run is active"
  since=$(field started "${owner}")
  holder=$(field who "${owner}")

  case $(holder_state "${owner}") in
    alive) yield "another run is active since ${since:-unknown} (${holder:-unknown})" ;;
    unknown) yield "lock held since ${since:-unknown} by a run whose process cannot be checked; a human removes ${LOCK} after checking that no Claude run is active" ;;
  esac

  # The holder has stopped. Recover under a second atomic guard so that only
  # one contender re-checks and removes the stale lock.
  stale_token=$(field token "${owner}")
  mkdir "${GUARD}" 2>/dev/null || yield "another run is recovering the lock (if this persists, a human removes ${GUARD})"
  if [ -n "${stale_token}" ] && [ "$(field token "${owner}")" = "${stale_token}" ] && [ "$(holder_state "${owner}")" = dead ]; then
    mkdir -p "${LOCK_ROOT}/recovered"
    mv "${owner}" "${LOCK_ROOT}/recovered/claude-routine.$(date -u +%Y%m%dT%H%M%SZ).$$" 2>/dev/null
    rm -rf "${LOCK}"
  fi
  rmdir "${GUARD}"

  if mkdir "${LOCK}" 2>/dev/null; then
    write_owner "${token}" "${who}"
    held "recovered the lock of a stopped run (started ${since:-unknown}, ${holder:-unknown})" "${token}"
  fi
  yield "another run took the lock first"
}

release() {
  token=${1:-}
  if [ -z "${token}" ]; then
    echo "Claude routine: release needs the LOCK_TOKEN printed by acquire"
    exit 1
  fi
  if ! take_guard; then
    echo "Claude routine: lock left in place (a recovery is in progress or ${GUARD} was left behind; a human checks it)"
    exit 1
  fi
  if [ "$(field token "${LOCK}/owner")" = "${token}" ]; then
    rm -rf "${LOCK}"
    rmdir "${GUARD}"
    echo "Claude routine: lock released"
  else
    rmdir "${GUARD}"
    echo "Claude routine: lock left in place (not held by this run)"
  fi
}

status() {
  if [ ! -d "${LOCK}" ]; then
    echo "Claude routine: lock free"
    return 0
  fi
  cat "${LOCK}/owner" 2>/dev/null || echo "(no owner file)"
  echo "holder=$(holder_state "${LOCK}/owner")"
  if [ -d "${GUARD}" ]; then echo "recover_guard=present"; fi
  return 0
}

case "${1:-}" in
  acquire)
    shift
    acquire "$@"
    ;;
  release)
    shift
    release "$@"
    ;;
  status) status ;;
  *)
    echo "usage: run-lock.sh acquire <who> | release <token> | status"
    exit 1
    ;;
esac
