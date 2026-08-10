import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function appendRunSummary(path, summary) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(summary)}\n`, { mode: 0o600 });
}
