import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';

import { parseAndValidateLedger } from './loop-accountability.mjs';

export const DEFAULT_LOOP_BUDGETS = {
  max_iterations: 2,
  max_tokens: 100_000_000,
  max_cost_usd: 1,
};

const PROHIBITED_COMMANDS = [
  /\bgit\s+push\b[^\n]*\s--force(?:-with-lease)?\b/i,
  /\bgh\s+pr\s+(?:merge|close)\b/i,
  /\bgh\s+pr\s+review\b[^\n]*\s--approve\b/i,
  /\brm\s+-rf\b/i,
];

function parseEvents(contents) {
  const events = [];
  for (const line of String(contents ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Codex may interleave non-JSON diagnostics; the JSON event stream remains authoritative.
    }
  }
  return events;
}

function agentId(events, role) {
  const id = events.find((event) => event.type === 'thread.started')?.thread_id;
  if (!id) throw new TypeError(`${role} event stream is missing thread.started identity`);
  return id;
}

function usageFromEvents(events) {
  return events
    .filter((event) => event.type === 'turn.completed')
    .reduce(
      (usage, event) => ({
        iterations: usage.iterations + 1,
        tokens: usage.tokens + Number(event.usage?.input_tokens ?? 0) + Number(event.usage?.output_tokens ?? 0),
        cost_usd: usage.cost_usd,
      }),
      { iterations: 0, tokens: 0, cost_usd: 0 }
    );
}

function actionsFromEvents(events, repoRoot, at) {
  const actions = [];

  for (const event of events) {
    if (event.type !== 'item.completed') continue;

    if (event.item?.type === 'file_change') {
      for (const change of event.item.changes ?? []) {
        const target = relative(repoRoot, change.path);
        if (!target || target === '..' || target.startsWith('../')) continue;
        actions.push({ kind: 'file', access: 'write', target });
      }
    }

    if (event.item?.type === 'command_execution' && Number.isInteger(event.item.exit_code)) {
      const command = String(event.item.command ?? '');
      if (PROHIBITED_COMMANDS.some((pattern) => pattern.test(command))) {
        throw new Error(`prohibited command observed in Codex event stream: ${command}`);
      }
      actions.push({ kind: 'command', command, exit_code: event.item.exit_code });
    }
  }

  return actions.map((action, index) => ({ sequence: index + 1, at, ...action }));
}

/** @param {any} options */
export function buildAccountabilityRecord({
  runId,
  role,
  pr,
  issue,
  branch,
  head,
  repoRoot,
  actorEvents,
  evaluatorEvents,
  verdict,
  completedAt,
  budgets = DEFAULT_LOOP_BUDGETS,
}) {
  const actorEventList = parseEvents(actorEvents);
  const evaluatorEventList = parseEvents(evaluatorEvents);
  const usage = usageFromEvents(actorEventList);
  const stopReason = verdict === 'PASS' ? 'accepted' : verdict === 'FAIL' ? 'rejected' : 'blocked';

  const record = {
    schema_version: 1,
    run_id: runId,
    agent: {
      id: agentId(actorEventList, 'actor'),
      role,
    },
    work: {
      issue,
      branch,
      head_sha: head,
    },
    permissions: {
      read_paths: ['.'],
      write_paths: ['.'],
      denied_paths: ['.env', '.git/'],
      commands: ['*'],
      denied_commands: ['git push --force*', 'gh pr merge*', 'gh pr close*', 'gh pr review --approve*', 'rm -rf*'],
    },
    budgets,
    usage,
    actions: actionsFromEvents(actorEventList, repoRoot, completedAt),
    stop: {
      reason: stopReason,
      at: completedAt,
    },
    evaluation: {
      agent_id: agentId(evaluatorEventList, 'evaluator'),
      head_sha: head,
      verdict,
      at: completedAt,
    },
    outcome: {
      accepted_change: verdict === 'PASS' ? `PR #${pr} @ ${head}` : null,
    },
  };

  parseAndValidateLedger(`${JSON.stringify(record)}\n`);
  return record;
}

export function appendAccountabilityRecord(ledgerPath, record) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  const existing = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8') : '';
  const separator = existing && !existing.endsWith('\n') ? '\n' : '';
  const line = `${JSON.stringify(record)}\n`;
  parseAndValidateLedger(`${existing}${separator}${line}`);
  appendFileSync(ledgerPath, `${separator}${line}`, { encoding: 'utf8', mode: 0o600 });
}
