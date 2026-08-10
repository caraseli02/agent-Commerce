import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

export const MAX_REPAIR_ATTEMPTS = 2;

/** @returns {any} */
export function createLoopState() {
  return { version: 1, repairs: {}, attemptsByPr: {}, evaluations: {} };
}

/** @param {any} state */
export function processedKeys(state) {
  return new Set(Object.keys(state.repairs ?? {}));
}

/** @param {any} state */
export function canRepair(state, pr) {
  return Number(state.attemptsByPr?.[pr] ?? 0) < MAX_REPAIR_ATTEMPTS;
}

/** @param {any} state */
export function beginRepair(state, { pr, key, head, at }) {
  state.repairs[key] = { pr, head, startedAt: at, result: 'running' };
  state.attemptsByPr[pr] = Number(state.attemptsByPr[pr] ?? 0) + 1;
  return state;
}

/**
 * @param {any} state
 * @param {{ key: string, result: string, headAfter?: string | null, at: string }} options
 */
export function finishRepair(state, { key, result, headAfter = null, at }) {
  if (!state.repairs[key]) throw new TypeError(`unknown repair key: ${key}`);
  Object.assign(state.repairs[key], { result, headAfter, completedAt: at });
  return state;
}

/** @param {any} state */
export function hasEvaluation(state, head) {
  return Boolean(state.evaluations?.[head]);
}

/** @param {any} state */
export function beginEvaluation(state, { pr, head, at }) {
  state.evaluations[head] = { pr, startedAt: at, verdict: 'running' };
  return state;
}

/** @param {any} state */
export function finishEvaluation(state, { head, verdict, at }) {
  if (!state.evaluations[head]) throw new TypeError(`unknown evaluation head: ${head}`);
  Object.assign(state.evaluations[head], { verdict, completedAt: at });
  return state;
}

/** @returns {any} */
export function readLoopState(path) {
  if (!existsSync(path)) return createLoopState();
  const state = JSON.parse(readFileSync(path, 'utf8'));
  if (state.version !== 1 || !state.repairs || !state.attemptsByPr || !state.evaluations) {
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
