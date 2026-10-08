#!/usr/bin/env node
// PreToolUse guard for Claude's unattended runs on the Mac mini (proposal P2).
//
// Claude Code passes the tool call as JSON on stdin. Exit 2 blocks the call and
// shows stderr to Claude; exit 0 leaves the normal permission flow in charge.
// Any error inside this script also blocks (fail closed).
//
// With GitHub Pro deferred there is no branch protection, so this hook plus the
// Bash sandbox is Claude's client-side guard against merging, approving,
// force-pushing, deleting remote branches, pushing to main, bypassing git hooks
// and exposing credentials. It is a best-effort screen of the command text, not
// a full shell parser: it recognizes git/gh behind the usual wrappers, and when
// a segment mentions git push or a sensitive gh command it cannot attribute to a
// plain git/gh invocation, it blocks instead of guessing. Without server-side
// protection, a determined bypass (for example a script file written first and
// run later) is still possible; the reviewer and Vlad's merge remain the final
// line.
//
// Installed by copying it to ~/.local/share/agent-commerce/hooks/ (see
// .factory/README.md); tests: node --test .factory/hooks/bash-guard.test.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PROTECTED_BRANCHES = new Set(['main', 'master']);

// Split a shell command into simple-command segments. Quotes are respected so
// separators inside a quoted string do not split it; command substitutions are
// scanned as their own segments as well.
export function segments(command) {
  const parts = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '\n' || ch === ';' || ch === '&' || ch === '|' || ch === '(' || ch === ')' || ch === '`') {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  const nested = [];
  for (const match of command.matchAll(/\$\(([^()]*)\)|`([^`]*)`|(?:bash|sh|zsh)\s+-c\s+(['"])(.*?)\3/g)) {
    nested.push(...segments(match[1] ?? match[2] ?? match[4] ?? ''));
  }
  return [...parts, ...nested].map((part) => part.trim()).filter(Boolean);
}

export function tokens(segment) {
  const out = [];
  for (const match of segment.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)) {
    out.push(match[1] ?? match[2] ?? match[3].replace(/['"\\]/g, ''));
  }
  return out;
}

// Wrappers that run their arguments as a command, with the options that take a
// value. Unknown options of a wrapper make the segment opaque.
const WRAPPERS = {
  env: { flags: ['-i', '--ignore-environment', '-0', '--null', '-v'], withValue: ['-u', '--unset', '-C', '--chdir', '-P'] },
  command: { flags: ['-p'], withValue: [] },
  exec: { flags: ['-c', '-l'], withValue: ['-a'] },
  nohup: { flags: [], withValue: [] },
  time: { flags: ['-p', '-l'], withValue: [] },
  nice: { flags: [], withValue: ['-n'] },
  timeout: { flags: ['--foreground', '-f', '-p'], withValue: ['-s', '--signal', '-k', '--kill-after'], positional: 1 },
};

// Drop leading VAR=value assignments and wrappers. Returns the remaining words,
// or null when the segment runs its command through something this guard
// cannot see into (sudo, eval, xargs, env -S, unknown wrapper options).
function commandWords(words) {
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(word)) {
      i += 1;
      continue;
    }
    const name = program(word);
    if (['sudo', 'doas', 'eval', 'xargs', 'parallel', 'watch', 'script'].includes(name)) return null;
    const wrapper = WRAPPERS[name];
    if (!wrapper) break;
    i += 1;
    let positional = wrapper.positional ?? 0;
    while (i < words.length) {
      const arg = words[i];
      if (arg === '--') {
        i += 1;
        break;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg) && name === 'env') i += 1;
      else if (wrapper.flags.includes(arg)) i += 1;
      else if (wrapper.withValue.includes(arg)) i += 2;
      else if (arg.startsWith('-')) {
        if (name === 'nice' && /^-\d+$/.test(arg)) i += 1;
        else return null;
      } else if (positional > 0) {
        positional -= 1;
        i += 1;
      } else break;
    }
  }
  return words.slice(i);
}

function program(word) {
  return (word ?? '').split('/').pop();
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['-C', cwd, 'symbolic-ref', '--quiet', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function branchName(ref) {
  return ref.replace(/^refs\/heads\//, '');
}

function checkGitPush(args, cwd) {
  // args are the words after "push"; globals before "push" (such as -C dir) are handled by the caller.
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (/^--(force|force-with-lease)(=.*)?$/.test(arg)) return 'force-push';
    if (['--delete', '--mirror', '--all', '--prune'].includes(arg)) return `git push ${arg}`;
    if (arg === '--no-verify') return 'skipping the pre-push hook (--no-verify)';
    if (['--repo', '--receive-pack', '--exec', '-o', '--push-option'].includes(arg)) {
      i += 1;
      continue;
    }
    if (/^-[^-]/.test(arg)) {
      if (/[fd]/.test(arg.slice(1))) return `git push ${arg} (force or delete)`;
      continue;
    }
    if (!arg.startsWith('-')) positionals.push(arg);
  }
  const refspecs = positionals.slice(1);
  const branch = currentBranch(cwd);
  if (refspecs.length === 0) {
    return PROTECTED_BRANCHES.has(branch) ? `pushing the checked-out ${branch} branch` : null;
  }
  for (const spec of refspecs) {
    if (spec.startsWith('+')) return `forced refspec ${spec}`;
    if (spec.startsWith(':')) return `deleting remote ref ${spec}`;
    const parts = spec.split(':');
    let destination = branchName(parts[parts.length - 1]);
    if (destination === 'HEAD' || destination === '@') destination = branch;
    if (PROTECTED_BRANCHES.has(destination)) return `pushing to ${destination}`;
  }
  return null;
}

function checkGit(words, cwd) {
  let dir = cwd;
  let i = 1;
  while (i < words.length && words[i].startsWith('-')) {
    if (words[i] === '-C' && words[i + 1]) {
      dir = words[i + 1].startsWith('/') ? words[i + 1] : `${dir}/${words[i + 1]}`;
      i += 2;
    } else if (words[i] === '-c') {
      if (/^core\.hookspath/i.test(words[i + 1] ?? '')) return 'overriding the git hooks path';
      i += 2;
    } else if (words[i].startsWith('--config-env')) return 'git --config-env (could override hooks or credentials)';
    else i += 1;
  }
  const sub = words[i];
  const rest = words.slice(i + 1);
  if (sub === 'push') return checkGitPush(rest, dir);
  if (sub === 'config' && rest.some((arg) => /^(core\.hookspath|credential\.|include\.|includeif\.)/i.test(arg))) {
    return 'changing git hooks, credential or include configuration';
  }
  if (sub === 'commit' && (rest.includes('--no-verify') || rest.some((arg) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(arg)))) {
    return 'skipping the commit hooks (--no-verify)';
  }
  return null;
}

function checkGh(words) {
  const [, group, action] = words;
  const rest = words.slice(2);
  if (group === 'pr' && action === 'merge') return 'merging a PR (only Vlad merges)';
  if (group === 'pr' && action === 'review' && rest.some((arg) => arg === '--approve' || arg === '-a')) {
    return 'approving a PR via GitHub review';
  }
  if (group === 'repo' && ['delete', 'archive', 'rename', 'edit'].includes(action)) return `gh repo ${action}`;
  if (['secret', 'variable', 'ruleset'].includes(group) && action !== 'list') return `gh ${group} ${action}`;
  if (group === 'auth' && ['token', 'login', 'logout', 'refresh', 'switch', 'setup-git'].includes(action)) {
    return `gh auth ${action} (credentials are set up by Vlad)`;
  }
  if (group === 'auth' && rest.some((arg) => arg === '--show-token' || /^-[a-zA-Z]*t[a-zA-Z]*$/.test(arg))) {
    return 'printing the GitHub token';
  }
  if (group === 'config' && action !== 'list' && words.some((arg) => /token/i.test(arg))) return 'reading gh token configuration';
  if (group === 'config' && action === 'set') return 'gh config set';
  if (group === 'api') {
    const endpoint = words.slice(2).find((arg) => !arg.startsWith('-')) ?? '';
    if (endpoint === 'graphql') {
      if (/\bmutation\b/i.test(words.join(' '))) return 'GraphQL mutation via gh api';
      for (let i = 2; i < words.length; i += 1) {
        const arg = words[i];
        if (arg === '--input' || arg.startsWith('--input=')) return 'GraphQL request from a file (cannot be inspected)';
        const value = /^(-f|-F|--field|--raw-field)$/.test(arg)
          ? words[i + 1]
          : (arg.match(/^(?:-[fF]|--field=|--raw-field=)(.+)$/) ?? [])[1];
        if (value && /^[^=]*=@/.test(value)) return 'GraphQL field read from a file (cannot be inspected)';
      }
      return null;
    }
    for (let i = 2; i < words.length; i += 1) {
      const arg = words[i];
      const method = arg === '-X' || arg === '--method' ? words[i + 1] : (arg.match(/^(?:-X|--method=)(.+)$/) ?? [])[1];
      if (method && method.toUpperCase() !== 'GET') return `gh api ${method.toUpperCase()} (use gh pr/issue commands)`;
      if (/^(-f|-F|--field|--raw-field|--input)(=|$)/.test(arg)) return 'gh api write with fields (use gh pr/issue commands)';
    }
  }
  return null;
}

const OPAQUE_GIT = /\bgit\b[\s\S]*\bpush\b/;
const OPAQUE_GH = /\bgh\b[\s\S]*\b(merge|api|auth|config|secret|ruleset)\b/;

export function check(command, cwd = process.cwd()) {
  const flat = command.replace(/['"\\]/g, '');
  if (/(^|[^A-Za-z0-9_])HUSKY=/.test(flat) || /\bexport\s+HUSKY\b/.test(flat)) return 'disabling git hooks (HUSKY)';
  if (
    /(^|[^A-Za-z0-9_])(GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN|GH_CONFIG_DIR|GIT_CONFIG_GLOBAL|GIT_CONFIG_SYSTEM|GIT_CONFIG_COUNT|GIT_CONFIG_PARAMETERS|GIT_CONFIG_KEY_\d+|GIT_CONFIG_VALUE_\d+|GIT_ASKPASS|GIT_DIR|GIT_WORK_TREE)=/.test(
      flat,
    )
  ) {
    return 'overriding the GitHub credential or git configuration environment';
  }
  if (/\bunset\b[^\n;&|]*\b(GH_CONFIG_DIR|GH_TOKEN)\b/.test(flat)) return 'unsetting the GitHub credential environment';
  for (const segment of segments(command)) {
    const words = commandWords(tokens(segment));
    const text = segment.replace(/['"\\]/g, '');
    const name = words ? program(words[0]) : null;
    let reason = null;
    if (name === 'git') reason = checkGit(words, cwd);
    else if (name === 'gh') reason = checkGh(words);
    else if (name === 'security' && /^find-(generic|internet)-password$/.test(words[1] ?? '')) {
      reason = 'reading secrets from the keychain';
    } else if (OPAQUE_GIT.test(text) || OPAQUE_GH.test(text)) {
      reason = 'a git push or sensitive gh command behind a wrapper this guard cannot inspect; run it as a plain git/gh command';
    }
    if (!reason && name !== 'gh' && /hosts\.yml|gh-agent-commerce-claude/.test(text)) reason = 'reading the gh credential file';
    if (reason) return reason;
  }
  return null;
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch (error) {
    process.stderr.write(`bash-guard: could not read the hook input (${error.message}); blocked\n`);
    process.exit(2);
  }
  if (input.tool_name !== 'Bash') process.exit(0);
  const reason = check(String(input.tool_input?.command ?? ''), input.cwd || process.cwd());
  if (reason) {
    process.stderr.write(
      `Blocked by the agent-Commerce guard: ${reason}. Agents never merge, approve, force-push, delete remote branches, push to main, bypass git hooks or handle credentials. If this blocks legitimate work, stop and report it (Factory improvement issue).\n`,
    );
    process.exit(2);
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`bash-guard: internal error (${error.message}); blocked\n`);
    process.exit(2);
  }
}
