import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

export const MAX_REPAIR_ATTEMPTS = 2;
export const RUNNING_MAX_AGE_MS = 25 * 60 * 1000;

/** @returns {any} */
export function createLoopState() {
  return { version: 3, dispatches: {}, attemptsByPr: {} };
}

function freshRunning(record, now) {
  const startedAt = Date.parse(record?.startedAt ?? '');
  return record?.result === 'running' && Number.isFinite(startedAt) && now - startedAt <= RUNNING_MAX_AGE_MS;
}

/** @param {any} state */
export function hasInFlightDispatch(state, pr, head, now = Date.now()) {
  return Object.values(state.dispatches ?? {}).some((record) => record?.pr === pr && record?.head === head && freshRunning(record, now));
}

/** @param {any} state */
export function processedKeys(state, now = Date.now()) {
  return new Set(
    Object.entries(state.dispatches ?? {})
      .filter(([, record]) => ['published', 'dispatched'].includes(record?.result) || freshRunning(record, now))
      .map(([key]) => key),
  );
}

/** @param {any} state */
export function canRepair(state, pr) {
  return Number(state.attemptsByPr?.[pr] ?? 0) < MAX_REPAIR_ATTEMPTS;
}

/** @param {any} state */
export function beginDispatch(state, { pr, key, head, at }) {
  state.dispatches[key] = { pr, head, startedAt: at, result: 'running', countedAttempt: true };
  state.attemptsByPr[pr] = Number(state.attemptsByPr[pr] ?? 0) + 1;
  return state;
}

/**
 * @param {any} state
 * @param {{ key: string, result: string, commentUrl?: string | null, publishedHead?: string | null, at: string }} options
 */
export function finishDispatch(state, { key, result, commentUrl = null, publishedHead = null, at }) {
  if (!state.dispatches[key]) throw new TypeError(`unknown dispatch key: ${key}`);
  const record = state.dispatches[key];
  // Migrate older running records that predate pre-dispatch attempt accounting.
  if (!record.countedAttempt) {
    state.attemptsByPr[record.pr] = Number(state.attemptsByPr[record.pr] ?? 0) + 1;
    record.countedAttempt = true;
  }
  Object.assign(state.dispatches[key], { result, commentUrl, publishedHead, completedAt: at });
  return state;
}

/** @returns {any} */
export function readLoopState(path) {
  if (!existsSync(path)) return createLoopState();
  const state = JSON.parse(readFileSync(path, 'utf8'));
  if (state.version !== 3 || !state.dispatches || !state.attemptsByPr) {
    throw new TypeError('invalid loop state');
  }
  return state;
}

/** @param {any} state */
export function writeLoopState(path, state) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporaryPath, path);
}
