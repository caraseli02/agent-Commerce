#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const OWNER_FILE = 'owner';
const HEARTBEAT_FILE = 'heartbeat.json';
const DEFAULT_LOCK_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const DEFAULT_HEARTBEAT_MAX_AGE_MS = 5 * 60 * 1000;

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Expected a valid date, received ${String(value)}`);
  }
  return date;
}

function defaultIsProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function readOwner(lockDir) {
  const ownerPath = join(lockDir, OWNER_FILE);

  try {
    const raw = readFileSync(ownerPath, 'utf8').trim();
    try {
      const parsed = JSON.parse(raw);
      return {
        pid: Number(parsed.pid),
        startedAt: parsed.startedAt,
        token: parsed.token,
      };
    } catch {
      const [pid, startedAt] = raw.split(/\r?\n/);
      return { pid: Number(pid), startedAt, token: null };
    }
  } catch {
    return { pid: null, startedAt: null, token: null };
  }
}

function lockAgeMs(lockDir, owner, now) {
  const startedAt = Date.parse(owner.startedAt ?? '');
  if (Number.isFinite(startedAt)) {
    return Math.max(0, now.getTime() - startedAt);
  }

  try {
    return Math.max(0, now.getTime() - statSync(lockDir).mtimeMs);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function writeJsonAtomically(path, value) {
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporaryPath, path);
}

export function acquireLeaseLock({
  root,
  pid = process.pid,
  now = new Date(),
  maxAgeMs = DEFAULT_LOCK_MAX_AGE_MS,
  isProcessAlive = defaultIsProcessAlive,
} = {}) {
  if (!root) throw new TypeError('acquireLeaseLock requires root');

  const acquiredAt = asDate(now);
  const lockDir = join(root, '.lock');
  const token = randomUUID();
  mkdirSync(root, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      mkdirSync(lockDir);
      writeJsonAtomically(join(lockDir, OWNER_FILE), {
        version: 1,
        pid,
        startedAt: acquiredAt.toISOString(),
        token,
      });
      return { acquired: true, recovered: attempt > 0, reason: 'acquired', pid, token, lockDir };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;

      const owner = readOwner(lockDir);
      const ownerPid = Number.isInteger(owner.pid) && owner.pid > 0 ? owner.pid : null;
      if (ownerPid && isProcessAlive(ownerPid)) {
        return { acquired: false, recovered: false, reason: 'active-owner', pid: ownerPid, lockDir };
      }

      const ageMs = lockAgeMs(lockDir, owner, acquiredAt);
      if (!ownerPid && ageMs <= maxAgeMs) {
        return { acquired: false, recovered: false, reason: 'recent-unknown-owner', pid: null, ageMs, lockDir };
      }

      const staleDir = `${lockDir}.stale-${process.pid}-${randomUUID()}`;
      try {
        renameSync(lockDir, staleDir);
        rmSync(staleDir, { recursive: true, force: true });
      } catch (recoveryError) {
        if (recoveryError?.code === 'ENOENT') continue;
        return { acquired: false, recovered: false, reason: 'recovery-race', pid: ownerPid, ageMs, lockDir };
      }
    }
  }

  return { acquired: false, recovered: false, reason: 'recovery-race', pid: null, lockDir };
}

export function releaseLeaseLock(lease) {
  if (!lease?.acquired || !lease.lockDir || !lease.token) return false;

  const owner = readOwner(lease.lockDir);
  if (owner.token !== lease.token) return false;

  rmSync(lease.lockDir, { recursive: true, force: true });
  return true;
}

export function recordHeartbeat(root, { status, at = new Date(), ...details } = {}) {
  if (!root) throw new TypeError('recordHeartbeat requires root');
  if (!status) throw new TypeError('recordHeartbeat requires status');

  mkdirSync(root, { recursive: true });
  const heartbeat = {
    version: 1,
    status,
    at: asDate(at).toISOString(),
    ...details,
  };
  writeJsonAtomically(join(root, HEARTBEAT_FILE), heartbeat);
  return heartbeat;
}

export function readControllerHealth(
  root,
  { now = new Date(), maxAgeMs = DEFAULT_HEARTBEAT_MAX_AGE_MS, isProcessAlive = defaultIsProcessAlive } = {}
) {
  if (!root) throw new TypeError('readControllerHealth requires root');

  let heartbeat;
  try {
    heartbeat = JSON.parse(readFileSync(join(root, HEARTBEAT_FILE), 'utf8'));
  } catch (error) {
    return {
      status: error?.code === 'ENOENT' ? 'missing' : 'invalid',
      ageMs: null,
      heartbeat: null,
    };
  }

  const heartbeatAt = Date.parse(heartbeat.at ?? '');
  if (!Number.isFinite(heartbeatAt)) {
    return { status: 'invalid', ageMs: null, heartbeat };
  }

  const ageMs = Math.max(0, asDate(now).getTime() - heartbeatAt);
  if (heartbeat.status === 'failed') {
    return { status: 'failed', ageMs, heartbeat };
  }

  if (ageMs > maxAgeMs) {
    const owner = readOwner(join(root, '.lock'));
    if (Number.isInteger(owner.pid) && owner.pid > 0 && isProcessAlive(owner.pid)) {
      return { status: 'running', ageMs, heartbeat };
    }
  }

  return {
    status: ageMs > maxAgeMs ? 'stale' : 'healthy',
    ageMs,
    heartbeat,
  };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runCli() {
  if (process.argv[2] !== 'health') {
    console.error('Usage: node scripts/loop-controller-runtime.mjs health --root <automation-root> [--max-age-ms <ms>]');
    process.exitCode = 2;
    return;
  }

  const root = argumentValue('--root');
  const maxAgeValue = argumentValue('--max-age-ms');
  const health = readControllerHealth(root, {
    maxAgeMs: maxAgeValue ? Number(maxAgeValue) : DEFAULT_HEARTBEAT_MAX_AGE_MS,
  });
  console.log(JSON.stringify(health, null, 2));
  process.exitCode = health.status === 'healthy' ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
