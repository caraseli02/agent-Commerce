#!/bin/sh
# Fixture for claude-routine.md "Resume the branch": runs the same git steps in a
# temporary repo across interrupted runs. Run: sh .factory/bin/resume.test.sh
set -u
: "${TMPDIR:=/tmp}"
T=$(mktemp -d); cd "$T"
git init -q --bare origin.git
git clone -q origin.git main 2>/dev/null; cd main
git config user.email t@t; git config user.name t
echo base > a.txt; git add a.txt; git commit -qm base; git push -q origin HEAD:main 2>/dev/null
git fetch -q origin
N=7; B=claude/issue-$N
fail=0; ok(){ echo "ok   - $1"; }; bad(){ echo "FAIL - $1"; fail=1; }

# resume procedure for a run in worktree $1 (run-local branch name $2)
resume() {
  wt=$1; rb=$2
  ( cd "$wt" || exit 1
    git fetch -q origin "$B" && git checkout -q -b "$rb" "origin/$B" || exit 1
    me=$(pwd -P)
    git worktree list --porcelain | awk '/^worktree /{p=$2} /^branch /{print p" "$2}' | while read -r path br; do
      [ "$(cd "$path" && pwd -P)" = "$me" ] && continue
      case "$br" in refs/heads/$B|refs/heads/$B-run-*) ;; *) continue ;; esac
      sha=$(git -C "$path" rev-parse HEAD)
      dirty=$(git -C "$path" status --porcelain)
      if git merge-base --is-ancestor "$sha" "origin/$B"; then
        [ -z "$dirty" ] && continue
        git log "origin/$B" --grep "recover interrupted work from $path" --format=%h | grep -q . && continue
      else
        git merge -q --ff-only "$sha" 2>/dev/null || git merge -q --no-edit "$sha" || exit 1
      fi
      git -C "$path" diff --binary HEAD > "$TMPDIR/resume.patch"
      if [ -s "$TMPDIR/resume.patch" ]; then git apply --3way --index "$TMPDIR/resume.patch" || exit 1; fi
      git -C "$path" ls-files --others --exclude-standard | while read -r f; do
        if [ -e "$f" ] && ! cmp -s "$f" "$path/$f"; then exit 1; fi
        mkdir -p "$(dirname "$f")"; cp "$path/$f" "$f"; git add "$f"
      done || exit 1
      if ! git diff --cached --quiet; then git commit -qm "chore: recover interrupted work from $path at $sha"; fi
    done || exit 1
    git push -q origin "HEAD:$B" 2>/dev/null
  )
}

# claim run creates remote branch from a run-local branch
git worktree add -q ../w1 -b "$B-run-1" origin/main
( cd ../w1 && git push -q origin "HEAD:refs/heads/$B" 2>/dev/null ) && ok "claim creates remote branch without holding its name" || bad claim
# run 1 interrupted: untracked-only work
echo new > ../w1/untracked.txt
git worktree add -q --detach ../w2 origin/main
resume ../w2 "$B-run-2" && [ "$(git -C ../w2 show HEAD:untracked.txt 2>/dev/null)" = new ] && ok "untracked-only work recovered (empty tracked patch skipped)" || bad "untracked-only"
# run 2 interrupted: clean tree with an unpublished commit
( cd ../w2 && echo c2 >> a.txt && git commit -qam "unpublished work" )
git worktree add -q --detach ../w3 origin/main
resume ../w3 "$B-run-3" && git -C ../w3 log --format=%s | grep -q "unpublished work" && ok "clean worktree with unpublished commit recovered" || bad "unpublished commit"
# run 3 interrupted: dirty tracked change on top
( cd ../w3 && echo dirty3 >> a.txt )
git worktree add -q --detach ../w4 origin/main
resume ../w4 "$B-run-4" && grep -q dirty3 ../w4/a.txt && ok "successive interrupted run: dirty change recovered on newer head" || bad "successive dirty"
# run 4 completes normally; run 5 must not re-apply anything (w1 untracked & w3 dirty already recovered)
before=$(git -C ../w4 rev-parse HEAD)
git worktree add -q --detach ../w5 origin/main
resume ../w5 "$B-run-5" && [ "$(git -C ../w5 rev-parse HEAD)" = "$before" ] && ok "next run finds nothing new and does not re-apply" || bad "idempotent"
[ "$(git -C ../w5 rev-parse HEAD)" = "$(git rev-parse origin/$B 2>/dev/null || git -C ../w5 rev-parse origin/$B)" ] && ok "remote branch equals final head" || bad "remote"
rm -rf "$T"; exit $fail
