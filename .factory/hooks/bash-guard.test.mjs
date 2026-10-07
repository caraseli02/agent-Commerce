// Tests for bash-guard.mjs. Run: node --test .factory/hooks/bash-guard.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { check } from './bash-guard.mjs';

const script = fileURLToPath(new URL('./bash-guard.mjs', import.meta.url));

function repoOn(branch) {
  const dir = mkdtempSync(join(tmpdir(), 'bash-guard-'));
  execFileSync('git', ['init', '-q', '-b', branch, dir]);
  return dir;
}

const onFeature = repoOn('claude/issue-42');
const onMain = repoOn('main');
after(() => {
  rmSync(onFeature, { recursive: true, force: true });
  rmSync(onMain, { recursive: true, force: true });
});

describe('blocked commands', () => {
  const blocked = [
    'gh pr merge 12 --squash',
    'gh pr merge',
    'cd x && gh pr merge 3',
    'gh pr review 5 --approve',
    'gh pr review 5 -a -b ok',
    'git push --force origin claude/issue-42',
    'git push -f',
    'git push -uf origin claude/issue-42',
    'git push --force-with-lease origin claude/issue-42',
    'git push --force-with-lease=claude/issue-42 origin claude/issue-42',
    'git push origin +claude/issue-42',
    'git push origin :old-branch',
    'git push origin --delete claude/issue-41',
    'git push -d origin claude/issue-41',
    'git push origin main',
    'git push origin HEAD:main',
    'git push origin claude/issue-42:refs/heads/main',
    'git push origin master',
    'git push --mirror origin',
    'git push --all origin',
    'git push --no-verify origin claude/issue-42',
    'HUSKY=0 git push origin claude/issue-42',
    'git commit --no-verify -m x',
    'git commit -nm x',
    'git -C /tmp/repo push --force',
    "bash -c 'git push --force origin x'",
    'echo $(gh pr merge 4)',
    'env FOO=1 git push -f',
    'gh api -X PUT repos/caraseli02/agent-Commerce/pulls/1/merge',
    'gh api --method DELETE repos/caraseli02/agent-Commerce/git/refs/heads/x',
    'gh api repos/caraseli02/agent-Commerce/pulls/1/reviews -f event=APPROVE',
    "gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'",
    'gh auth token',
    'gh repo delete caraseli02/agent-Commerce --yes',
    'gh secret set FOO',
    'GH_TOKEN=abc gh pr list',
    'GH_CONFIG_DIR=~/.config/gh gh pr list',
    'unset GH_CONFIG_DIR; gh pr list',
    'security find-generic-password -s agent-commerce-claude -w',
    // Codex review of #612 (ba33534b): wrapper, opaque payload, token and hook-bypass gaps.
    'env -- git push origin main',
    'env -i PATH=/usr/bin git push origin main',
    'env -S "git push origin main"',
    'timeout 60 git push --force origin x',
    'nice -n 5 git push origin main',
    'sudo git push origin main',
    'eval "git push origin main"',
    'echo origin main | xargs git push',
    'gh api graphql --input /tmp/payload.json',
    'gh api graphql -F query=@/tmp/mutation.graphql',
    'gh auth status --show-token',
    'gh auth status -t',
    'gh config get -h github.com oauth_token',
    'git -c core.hooksPath=/dev/null push origin claude/issue-123',
    'git -c core.hookspath=/dev/null commit -m x',
    'git config core.hooksPath /dev/null',
    "HUSKY='0' git push origin claude/issue-123",
    'HUSKY="0" git push origin claude/issue-123',
    'export HUSKY=0; git push origin claude/issue-123',
    'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null git push',
    "git push origin 'main'",
    'git push origin m"ai"n',
    'cat ~/.config/gh-agent-commerce-claude/hosts.yml',
  ];
  for (const command of blocked) {
    it(command, () => {
      assert.ok(check(command, onFeature), `expected a block for: ${command}`);
    });
  }

  it('git push with no refspec while main is checked out', () => {
    assert.ok(check('git push', onMain));
    assert.ok(check('git push origin', onMain));
    assert.ok(check('git push origin HEAD', onMain));
  });
});

describe('allowed commands', () => {
  const allowed = [
    'git push',
    'git push origin claude/issue-42',
    'git push -u origin claude/issue-42',
    'git push origin HEAD',
    'git push --set-upstream origin claude/issue-42',
    'git commit -m "fix: keep main green"',
    'git commit -F /tmp/msg.txt',
    'git fetch origin --prune',
    'git merge origin/main',
    'git checkout --detach origin/main',
    'git branch -D local-only',
    'gh pr list --state open --json number,headRefOid',
    'gh pr view 12 --json mergeable',
    'gh pr create --title t --body-file /tmp/body.md --label agent:claude',
    'gh pr comment 12 --body-file /tmp/verdict.md',
    'gh pr review 12 --comment -b "see verdict"',
    'gh issue edit 5 --add-label in-progress --remove-label ready-for-agent',
    'gh issue comment 5 --body-file /tmp/c.md',
    'gh auth status',
    'gh api repos/caraseli02/agent-Commerce/issues/5/comments --paginate --jq ".[].body"',
    'gh api graphql -f query="{ viewer { login } }"',
    'pnpm verify --base origin/main',
    'echo "review notes" > /tmp/note.txt',
    'env FOO=1 gh pr list',
    'timeout 600 pnpm test',
    'gh auth status',
    'git -c user.name=x commit -m msg',
    'gh api graphql -f query="{ repository(owner: \\"o\\", name: \\"r\\") { id } }"',
  ];
  for (const command of allowed) {
    it(command, () => {
      assert.equal(check(command, onFeature), null);
    });
  }
});

describe('hook protocol', () => {
  const run = (input) => spawnSync(process.execPath, [script], { input, encoding: 'utf8' });

  it('exits 2 with a reason for a blocked Bash call', () => {
    const result = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'gh pr merge 1' }, cwd: onFeature }));
    assert.equal(result.status, 2);
    assert.match(result.stderr, /merging a PR/);
  });

  it('exits 0 for an allowed Bash call and for other tools', () => {
    assert.equal(run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'gh pr list' }, cwd: onFeature })).status, 0);
    assert.equal(run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/x' } })).status, 0);
  });

  it('fails closed on unreadable input', () => {
    assert.equal(run('not json').status, 2);
  });
});
