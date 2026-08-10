#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export function annotateEventLine(line, observedAt = new Date().toISOString()) {
  try {
    const event = JSON.parse(line);
    return JSON.stringify({ ...event, observed_at: event.observed_at ?? observedAt });
  } catch {
    return line;
  }
}

function recordLines(input, output) {
  const lines = createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY });
  lines.on('line', (line) => output.write(`${annotateEventLine(line)}\n`));
  return once(lines, 'close');
}

export async function recordCommandEvents({ logPath, command, args = [], cwd, env = process.env }) {
  const output = createWriteStream(logPath, { flags: 'w', mode: 0o600 });
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdoutDone = recordLines(child.stdout, output);
  const stderrDone = recordLines(child.stderr, output);
  const [exitCode] = await once(child, 'close');
  await Promise.all([stdoutDone, stderrDone]);
  output.end();
  await once(output, 'finish');
  return Number.isInteger(exitCode) ? exitCode : 1;
}

async function main() {
  const [, , logPath, command, ...args] = process.argv;
  if (!logPath || !command) {
    process.stderr.write('Usage: node scripts/codex-event-recorder.mjs <log-path> <command> [args...]\n');
    process.exitCode = 2;
    return;
  }

  process.exitCode = await recordCommandEvents({ logPath, command, args, cwd: process.cwd() });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
