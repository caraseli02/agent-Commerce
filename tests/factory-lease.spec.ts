import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(process.cwd(), '.factory/bin/lease.sh');
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function newRoot() {
  const root = mkdtempSync(join(tmpdir(), 'factory-lease-'));
  roots.push(root);
  return root;
}

function env(root: string, ttl = 2700) {
  return { ...process.env, CLAUDE_LEASE_ROOT: root, LEASE_TTL_SECONDS: String(ttl) };
}

function run(root: string, args: string[], ttl?: number) {
  const result = spawnSync('bash', [script, ...args], { env: env(root, ttl), encoding: 'utf8' });
  return { code: result.status, out: result.stdout.trim(), err: result.stderr };
}

function runAsync(root: string, args: string[], ttl?: number) {
  return new Promise<{ code: number | null; out: string }>((resolve) => {
    const child = spawn('bash', [script, ...args], { env: env(root, ttl) });
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.on('close', (code) => resolve({ code, out: out.trim() }));
  });
}

describe('factory run lease', () => {
  it('lets exactly one of many simultaneous runs acquire (same-issue resume or repair)', async () => {
    const root = newRoot();
    const results = await Promise.all(Array.from({ length: 12 }, () => runAsync(root, ['generator', 'acquire'])));
    expect(results.filter((r) => r.code === 0)).toHaveLength(1);
    expect(results.filter((r) => r.code === 3)).toHaveLength(11);
  });

  it('blocks a second run while the lease is fresh and frees it on release', () => {
    const root = newRoot();
    const first = run(root, ['generator', 'acquire']);
    expect(first.code).toBe(0);
    expect(run(root, ['generator', 'acquire']).code).toBe(3);
    expect(run(root, ['generator', 'renew', first.out]).code).toBe(0);
    expect(run(root, ['generator', 'release', first.out]).code).toBe(0);
    expect(run(root, ['generator', 'acquire']).code).toBe(0);
  });

  it('rejects renew and release with a token that does not own the lease', () => {
    const root = newRoot();
    expect(run(root, ['generator', 'acquire']).code).toBe(0);
    expect(run(root, ['generator', 'renew', 'generator-someone-else']).code).toBe(4);
    expect(run(root, ['generator', 'release', 'generator-someone-else']).code).toBe(4);
    expect(run(root, ['generator', 'status']).out).toContain('held by');
  });

  it('lets exactly one of many simultaneous contenders take over a stale lease', async () => {
    const root = newRoot();
    const stale = run(root, ['generator', 'acquire']);
    expect(stale.code).toBe(0);
    writeFileSync(join(root, 'claude-generator', 'heartbeat'), `${Math.floor(Date.now() / 1000) - 3600}\n`);
    const results = await Promise.all(Array.from({ length: 12 }, () => runAsync(root, ['generator', 'acquire'], 60)));
    const winners = results.filter((r) => r.code === 0);
    expect(winners).toHaveLength(1);
    const winner = winners[0]!;
    // The dead run lost the lease: it must stop instead of pushing.
    expect(run(root, ['generator', 'renew', stale.out], 60).code).toBe(4);
    expect(run(root, ['generator', 'renew', winner.out], 60).code).toBe(0);
  });

  it('keeps generator and evaluator leases independent', () => {
    const root = newRoot();
    expect(run(root, ['generator', 'acquire']).code).toBe(0);
    expect(run(root, ['evaluator', 'acquire']).code).toBe(0);
  });
});
