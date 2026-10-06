#!/usr/bin/env bash
# Exclusive run lease for Claude factory routines on the Mac mini.
#
# Usage:
#   lease.sh <name> acquire            -> prints a token, exit 0; exit 3 if another live run holds it
#   lease.sh <name> renew <token>      -> refreshes the heartbeat; exit 4 if the lease is no longer yours
#   lease.sh <name> release <token>    -> removes the lease if it is yours; exit 4 otherwise
#   lease.sh <name> status             -> prints the current owner and heartbeat age
#
# The lease is a directory created with mkdir, which is atomic. A lease whose
# heartbeat is older than LEASE_TTL_SECONDS is stale; taking it over is
# serialized by a second mkdir-based guard, so exactly one contender wins.
# The lease lives outside the isolated worktrees so every run on this machine
# sees the same one.
set -euo pipefail

name="${1:?usage: lease.sh <name> acquire|renew|release|status [token]}"
action="${2:?usage: lease.sh <name> acquire|renew|release|status [token]}"
token="${3:-}"

case "$name" in *[!a-z0-9-]* | '') echo "invalid lease name: $name" >&2; exit 2 ;; esac

root="${CLAUDE_LEASE_ROOT:-/Users/work/GIT/.locks}"
dir="$root/claude-${name}"
guard="$dir.takeover"
ttl="${LEASE_TTL_SECONDS:-2700}"
guard_ttl=300

now() { date +%s; }
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }

# Heartbeat of the current lease; a lease directory still being written by its
# creator falls back to the directory mtime, so it counts as fresh.
heartbeat() {
  local hb
  hb="$(cat "$dir/heartbeat" 2>/dev/null || true)"
  [[ "$hb" =~ ^[0-9]+$ ]] || hb="$(mtime "$dir")"
  echo "$hb"
}

owner() { cat "$dir/owner" 2>/dev/null || echo "(unknown)"; }

write_owner() {
  printf '%s\n' "$1" >"$dir/owner"
  printf '%s\n' "$(now)" >"$dir/heartbeat"
  printf 'host=%s pid=%s started=%s\n' "$(hostname -s)" "$$" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$dir/meta"
}

new_token() { printf '%s-%s-%s\n' "$name" "$(date -u +%Y%m%dT%H%M%SZ)" "$(od -An -N4 -tx4 /dev/urandom | tr -d ' ')"; }

held_message() {
  echo "Lease $name held by $(owner) (heartbeat $(($(now) - $(heartbeat)))s ago, ttl ${ttl}s)" >&2
  exit 3
}

case "$action" in
  acquire)
    mkdir -p "$root"
    t="$(new_token)"
    if mkdir "$dir" 2>/dev/null; then
      write_owner "$t"
      echo "$t"
      exit 0
    fi
    # Lease exists. Fresh -> someone else is running.
    if (($(now) - $(heartbeat) < ttl)); then held_message; fi
    # Stale. Only one contender may take over: the one that creates the guard.
    if ! mkdir "$guard" 2>/dev/null; then
      if (($(now) - $(mtime "$guard") >= guard_ttl)); then
        echo "Removing abandoned takeover guard for $name" >&2
        rmdir "$guard" 2>/dev/null || true
      fi
      echo "Lease $name is being taken over by another run" >&2
      exit 3
    fi
    trap 'rmdir "$guard" 2>/dev/null || true' EXIT
    # Re-check under the guard: the lease may have been renewed or replaced.
    if [[ -d "$dir" ]] && (($(now) - $(heartbeat) < ttl)); then held_message; fi
    stale_owner="$(owner)"
    rm -rf "$dir"
    if ! mkdir "$dir" 2>/dev/null; then
      echo "Lease $name was acquired by another run during takeover" >&2
      exit 3
    fi
    write_owner "$t"
    echo "Took over stale lease $name from $stale_owner" >&2
    echo "$t"
    ;;
  renew)
    [[ -n "$token" ]] || { echo "renew needs the token from acquire" >&2; exit 2; }
    if [[ "$(owner)" != "$token" ]]; then
      echo "Lease $name is no longer owned by $token (owner: $(owner)). Stop now without pushing or editing GitHub." >&2
      exit 4
    fi
    printf '%s\n' "$(now)" >"$dir/heartbeat"
    ;;
  release)
    [[ -n "$token" ]] || { echo "release needs the token from acquire" >&2; exit 2; }
    if [[ "$(owner)" != "$token" ]]; then
      echo "Lease $name is not owned by $token; nothing released" >&2
      exit 4
    fi
    rm -rf "$dir"
    ;;
  status)
    if [[ -d "$dir" ]]; then
      echo "held by $(owner), heartbeat $(($(now) - $(heartbeat)))s ago, ttl ${ttl}s"
    else
      echo "free"
    fi
    ;;
  *)
    echo "unknown action: $action" >&2
    exit 2
    ;;
esac
