// Tests for bash-guard.mjs. Run: node --test .factory/hooks/bash-guard.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

// A checkout with the real PR template checker and two body files (#702 preflight).
const withChecker = repoOn('claude/issue-42');
mkdirSync(join(withChecker, 'scripts'));
copyFileSync(
  fileURLToPath(new URL('../../scripts/check-pr-template.mjs', import.meta.url)),
  join(withChecker, 'scripts/check-pr-template.mjs'),
);
const rubric = ['Scope control', 'Acceptance criteria', 'Verification evidence', 'Harness hygiene', 'Risk reporting'].map(
  (field) => `- ${field}: /10`,
);
const verification = ['build', 'lint', 'typecheck', 'test'].map((command) => `- [x] \`pnpm ${command}\` — outcome: passed`);
writeFileSync(
  join(withChecker, 'good.md'),
  ['## Verification', '', ...verification, '', '## Known risks', '', '- [x] None', '', '## Evaluator rubric', '', ...rubric, ''].join('\n'),
);
writeFileSync(
  join(withChecker, 'grouped.md'),
  [
    '## Verification',
    '',
    '- [x] `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`: all passed inside `pnpm verify`.',
    '',
    '## Known risks',
    '',
    '- [x] None',
    '',
    '## Evaluator rubric',
    '',
    ...rubric,
    '',
  ].join('\n'),
);

// The #703 review fixture: a valid body.md where the command starts and an invalid one in sub/.
copyFileSync(join(withChecker, 'good.md'), join(withChecker, 'body.md'));
mkdirSync(join(withChecker, 'sub'));
copyFileSync(join(withChecker, 'grouped.md'), join(withChecker, 'sub/body.md'));

after(() => {
  rmSync(onFeature, { recursive: true, force: true });
  rmSync(onMain, { recursive: true, force: true });
  rmSync(withChecker, { recursive: true, force: true });
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
    // Only Vlad sets owner-approved-harness (2026-10-08).
    'gh pr edit 615 --add-label owner-approved-harness',
    'gh pr edit 615 --remove-label owner-approved-harness',
    'gh pr create --title t --body-file b.md --label agent:claude --label owner-approved-harness',
    'gh issue edit 5 --add-label "owner-approved-harness"',
    'gh label delete owner-approved-harness --yes',
    'gh label create something',
    // The gh account is shared, so the last comment may be Vlad's or Codex's (2026-10-13).
    'gh issue comment 641 --edit-last --body-file plan.md',
    'gh pr comment 12 --edit-last --body x',
    'gh issue comment 641 --delete-last --yes',
    // gh accepts global flags before the command group.
    'gh -R caraseli02/agent-Commerce pr merge 1',
    'gh --repo caraseli02/agent-Commerce issue comment 5 --edit-last --body x',
    'gh --repo=caraseli02/agent-Commerce pr review 3 --approve',
    'gh -Rcaraseli02/agent-Commerce label create x',
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
    'gh issue comment 641 --body-file plan.md',
    'gh issue create --title "Claude morning digest" --body x',
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
    'gh pr comment 12 --body-file /tmp/verdict.md',
    'gh pr review 12 --comment -b "see verdict"',
    'gh issue edit 5 --add-label in-progress --remove-label ready-for-agent',
    'gh label list',
    'gh pr view 615 --json labels',
    'gh issue comment 5 --body-file /tmp/c.md',
    'gh -R caraseli02/agent-Commerce issue comment 5 --body-file b.md',
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

describe('PR template preflight on gh pr create / edit (#702)', () => {
  const allowed = [
    'gh pr create --head claude/issue-42 --base main --title t --body-file good.md --label agent:claude',
    `gh pr create --title t --body-file ${join(withChecker, 'good.md')} --label agent:claude`,
    'gh pr create --title t -F good.md',
    'gh pr create --title t --body-file=good.md',
    'gh pr edit 12 --body-file good.md',
    'gh pr edit 12 --add-label in-progress',
    'gh pr edit 12 --title "new title"',
    `cd sub && gh pr create --title t --body-file ${join(withChecker, 'good.md')}`,
    `cd sub && gh pr edit 12 --body-file ${join(withChecker, 'good.md')}`,
  ];
  for (const command of allowed) {
    it(`allows: ${command}`, () => {
      assert.equal(check(command, withChecker), null);
    });
  }

  const blocked = {
    'gh pr create --title t --body-file grouped.md --label agent:claude': /pnpm build, pnpm lint, pnpm typecheck, pnpm test/,
    'gh pr edit 12 --body-file grouped.md': /fails the template check/,
    'gh pr create --title t --body "x"': /--body-file/,
    'gh pr create --title t -b x': /--body-file/,
    'gh pr create --fill': /--body-file/,
    'gh pr create --title t': /--body-file/,
    'gh pr edit 12 --body x': /--body-file/,
    'gh pr create --title t --body-file missing.md': /not found/,
    'gh pr create --title t --body-file -': /not found/,
    'gh pr create --title t --body-file "$NO_SUCH_VAR_702/body.md"': /not found/,
    // gh sends the last body file, so a valid first file must not cover an invalid final one (#703 review).
    'gh pr create --title t --body-file good.md --body-file grouped.md': /exactly once/,
    'gh pr create --title t --body-file good.md -F grouped.md': /exactly once/,
    'gh pr edit 12 -F good.md --body-file=grouped.md': /exactly once/,
    'gh pr edit 12 -Fgrouped.md': /fails the template check/,
    'gh pr create --title t --body-file good.md -bx': /--body-file/,
    // A relative body path after a directory change would be read from another directory (#703 review).
    'cd sub && gh pr create --title t --body-file body.md': /absolute --body-file/,
    'cd sub && gh pr edit 12 --body-file body.md': /absolute --body-file/,
    'pushd sub; gh pr create --title t --body-file body.md': /absolute --body-file/,
    '(cd sub && gh pr create --title t --body-file body.md)': /absolute --body-file/,
    'env -C sub gh pr create --title t --body-file body.md': /absolute --body-file/,
    'bash -c "cd sub && gh pr edit 12 --body-file body.md"': /absolute --body-file/,
  };
  for (const [command, reason] of Object.entries(blocked)) {
    it(`blocks: ${command}`, () => {
      assert.match(check(command, withChecker) ?? '', reason);
    });
  }

  it('fails closed when the checkout has no checker', () => {
    writeFileSync(join(onFeature, 'good.md'), 'x');
    assert.match(check('gh pr create --title t --body-file good.md', onFeature) ?? '', /cannot find/);
  });
});
