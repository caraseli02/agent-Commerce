import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { acquireLeaseLock, readControllerHealth, recordHeartbeat, releaseLeaseLock } from '../scripts/loop-controller-runtime.mjs';

const temporaryRoots: string[] = [];

function temporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), 'ecas-loop-controller-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('loop controller runtime', () => {
  it('acquires and releases an unowned lease', () => {
    const root = temporaryRoot();
    const lease = acquireLeaseLock({ root, pid: 101, now: new Date('2026-08-09T12:00:00.000Z') });

    expect(lease).toMatchObject({ acquired: true, recovered: false, pid: 101 });
    expect(releaseLeaseLock(lease)).toBe(true);
  });

  it('does not steal a lease from a live owner', () => {
    const root = temporaryRoot();
    const firstLease = acquireLeaseLock({
      root,
      pid: 101,
      now: new Date('2026-08-09T12:00:00.000Z'),
      isProcessAlive: () => true,
    });

    const secondLease = acquireLeaseLock({
      root,
      pid: 202,
      now: new Date('2026-08-09T12:01:00.000Z'),
      isProcessAlive: () => true,
    });

    expect(firstLease.acquired).toBe(true);
    expect(secondLease).toMatchObject({ acquired: false, recovered: false, reason: 'active-owner' });
    expect(releaseLeaseLock(firstLease)).toBe(true);
  });

  it('recovers the legacy lock left by a dead process', () => {
    const root = temporaryRoot();
    const lockDir = join(root, '.lock');
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'owner'), '99999\n2026-07-17T09:34:44.000Z\n');

    const lease = acquireLeaseLock({
      root,
      pid: 303,
      now: new Date('2026-08-09T12:00:00.000Z'),
      isProcessAlive: () => false,
    });

    expect(lease).toMatchObject({ acquired: true, recovered: true, pid: 303 });
    expect(releaseLeaseLock(lease)).toBe(true);
  });

  it('reports a heartbeat as healthy until it exceeds the allowed age', () => {
    const root = temporaryRoot();
    recordHeartbeat(root, { status: 'healthy', at: new Date('2026-08-09T12:00:00.000Z') });

    expect(
      readControllerHealth(root, {
        now: new Date('2026-08-09T12:04:00.000Z'),
        maxAgeMs: 5 * 60 * 1000,
      })
    ).toMatchObject({ status: 'healthy', ageMs: 4 * 60 * 1000 });

    expect(
      readControllerHealth(root, {
        now: new Date('2026-08-09T12:06:00.000Z'),
        maxAgeMs: 5 * 60 * 1000,
      })
    ).toMatchObject({ status: 'stale', ageMs: 6 * 60 * 1000 });
  });

  it('reports a long-running controller as running while its lease owner is alive', () => {
    const root = temporaryRoot();
    const lease = acquireLeaseLock({ root, pid: 404, now: new Date('2026-08-09T10:00:00.000Z') });
    recordHeartbeat(root, { status: 'running', at: new Date('2026-08-09T10:00:00.000Z') });

    expect(
      readControllerHealth(root, {
        now: new Date('2026-08-09T12:00:00.000Z'),
        maxAgeMs: 5 * 60 * 1000,
        isProcessAlive: (pid) => pid === 404,
      })
    ).toMatchObject({ status: 'running', ageMs: 2 * 60 * 60 * 1000 });

    expect(releaseLeaseLock(lease)).toBe(true);
  });
});
