import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function parseEvents(contents) {
  return String(contents ?? '')
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

export function buildRunSummary(options) {
  const events = parseEvents(options.events);
  const usage = events
    .filter((event) => event.type === 'turn.completed')
    .reduce(
      (total, event) => ({
        turns: total.turns + 1,
        inputTokens: total.inputTokens + Number(event.usage?.input_tokens ?? 0),
        outputTokens: total.outputTokens + Number(event.usage?.output_tokens ?? 0),
        totalTokens: total.totalTokens + Number(event.usage?.input_tokens ?? 0) + Number(event.usage?.output_tokens ?? 0),
      }),
      { turns: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    );

  return {
    version: 1,
    runId: options.runId,
    role: options.role,
    pr: options.pr,
    issue: options.issue,
    head: options.head,
    sourceKey: options.sourceKey,
    startedAt: options.startedAt,
    completedAt: options.completedAt,
    result: options.result,
    tracePath: options.tracePath,
    agentId: events.find((event) => event.type === 'thread.started')?.thread_id ?? null,
    usage,
  };
}

export function appendRunSummary(path, summary) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(summary)}\n`, { mode: 0o600 });
}
