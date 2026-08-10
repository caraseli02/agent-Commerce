import { describe, expect, it } from 'vitest';

import { beginDispatch, canRepair, createLoopState, finishDispatch, processedKeys } from '../scripts/loop-state.mjs';

describe('loop state', () => {
  it('deduplicates a source-head pair and enforces the two-dispatch ceiling', () => {
    const state = createLoopState();
    const firstKey = `ci-failure:1:${'a'.repeat(40)}`;
    const secondKey = `changes-requested:2:${'b'.repeat(40)}`;

    beginDispatch(state, { pr: 42, key: firstKey, head: 'a'.repeat(40), at: '2026-08-10T10:00:00Z' });
    finishDispatch(state, {
      key: firstKey,
      result: 'dispatched',
      commentUrl: 'https://github.com/acme/repo/pull/42#issuecomment-1',
      at: '2026-08-10T10:10:00Z',
    });
    beginDispatch(state, { pr: 42, key: secondKey, head: 'b'.repeat(40), at: '2026-08-10T10:20:00Z' });
    finishDispatch(state, {
      key: secondKey,
      result: 'dispatched',
      commentUrl: 'https://github.com/acme/repo/pull/42#issuecomment-2',
      at: '2026-08-10T10:21:00Z',
    });

    expect([...processedKeys(state, Date.parse('2026-08-10T10:21:00Z'))]).toEqual([firstKey, secondKey]);
    expect(canRepair(state, 42)).toBe(false);
    expect(state.dispatches[firstKey]).toMatchObject({ result: 'dispatched' });
  });

  it('retries failed or stale-running dispatches without duplicating live work', () => {
    const state = createLoopState();
    const head = 'd'.repeat(40);
    const key = `ci-failure:3:${head}`;

    beginDispatch(state, { pr: 42, key, head, at: '2026-08-10T10:00:00Z' });
    expect(processedKeys(state, Date.parse('2026-08-10T10:05:00Z'))).toContain(key);
    finishDispatch(state, { key, result: 'failed', at: '2026-08-10T10:06:00Z' });
    expect(processedKeys(state, Date.parse('2026-08-10T10:07:00Z'))).not.toContain(key);
    expect(canRepair(state, 42)).toBe(true);

    beginDispatch(state, { pr: 43, key: `${key}:stale`, head, at: '2026-08-10T11:00:00Z' });
    expect(processedKeys(state, Date.parse('2026-08-10T11:05:00Z'))).toContain(`${key}:stale`);
    expect(processedKeys(state, Date.parse('2026-08-10T11:31:00Z'))).not.toContain(`${key}:stale`);
  });
});
