#!/usr/bin/env node
// Per-checkout ports for the servers that tests and gates start (e2e, visual, parity, smoke, PR screenshots).
//
// Several sessions share the Mac mini: the hourly routine, Codex and interactive worktrees. With fixed ports a
// second checkout's Playwright found the first checkout's server already answering and tested the wrong build
// (false e2e failures on PR #857). Each checkout therefore gets its own block of ports, derived from a stable
// hash of its path (the working directory: pnpm runs scripts and Playwright from the checkout root). TEST_PORT_BASE
// pins the block instead (TEST_PORT_BASE=3000 restores the old e2e port). `node scripts/worktree-port.mjs` prints
// this checkout's ports. No import.meta here: Playwright compiles its configs, and this import, to CommonJS.
import { createHash } from 'node:crypto';

// Offsets inside a block, so one checkout can run several of these servers at once. PR screenshots use two ports.
export const PORT_OFFSETS = Object.freeze({ e2e: 0, visual: 1, parity: 2, smoke: 3, screenshots: 4 });
// 900 blocks of 10 from 40000 to 48999: clear of the dev server (3000), the night lane's owned servers
// (3205/3206) and macOS's ephemeral range (49152 and up).
const FIRST_PORT = 40_000;
const BLOCKS = 900;
const BLOCK_SIZE = 10;

export function portBase(checkout = process.cwd(), env = process.env) {
  if (env.TEST_PORT_BASE) {
    const base = Number(env.TEST_PORT_BASE);
    if (!Number.isInteger(base) || base < 1024 || base > 65535 - BLOCK_SIZE)
      throw new Error(`TEST_PORT_BASE must be an integer from 1024 to ${65535 - BLOCK_SIZE}.`);
    return base;
  }
  return FIRST_PORT + (createHash('sha256').update(checkout).digest().readUInt32BE(0) % BLOCKS) * BLOCK_SIZE;
}

export function testPort(name, checkout = process.cwd(), env = process.env) {
  if (!Object.hasOwn(PORT_OFFSETS, name)) throw new Error(`Unknown test server ${name}.`);
  return portBase(checkout, env) + PORT_OFFSETS[name];
}

if (process.argv[1]?.endsWith('worktree-port.mjs')) {
  for (const name of Object.keys(PORT_OFFSETS)) console.log(`${name}=${testPort(name)}`);
}
