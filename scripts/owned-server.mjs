#!/usr/bin/env node
// Owned preview for the servers that tests and gates start themselves (e2e, visual, parity, smoke, PR screenshots).
//
// A derived port (scripts/worktree-port.mjs) is only a hint: another checkout can bind the same port between an
// availability check, the build and the server's own bind, and an HTTP readiness probe then accepts that
// checkout's app and database (PR #862 evaluation). So the port is held, never probed: the loopback addresses are
// bound before anything is built, Nitro listens on a Unix socket in a private directory, and the held port proxies
// to it. Another listener makes the bind fail and the run stop. Before Nitro answers and after it exits, every
// request gets a 503, never another process's response, and the port stays held until the run stops it.
//
//   node scripts/owned-server.mjs --port <port> [--build] [--entry .output/server/index.mjs]
//
// prints OWNED_SERVER_READY's line once it serves; Playwright waits for that line instead of polling the URL.
// No import.meta here: Playwright compiles its configs, and this import, to CommonJS.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const OWNED_SERVER_READY = /owned-server: ready http:\/\/127\.0\.0\.1:\d+/;
const STARTING = 'Owned test server is starting.';
const STOPPED = 'Owned test server has stopped.';

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ port, host }, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

/**
 * Binds `port` on 127.0.0.1 and, where the host has IPv6 loopback, ::1 (browsers resolve `localhost` to either).
 * Throws when another process holds either address.
 */
export async function holdPort(port, handler) {
  const held = [];
  try {
    for (const host of ['127.0.0.1', '::1']) {
      try {
        held.push(await listen(createServer(handler), port, host));
      } catch (error) {
        if (host === '::1' && ['EADDRNOTAVAIL', 'EAFNOSUPPORT'].includes(error.code)) continue;
        if (error.code === 'EADDRINUSE')
          throw new Error(`Port ${port} on ${host} is already in use; refusing to test another process's server.`, { cause: error });
        throw error;
      }
    }
    return held;
  } catch (error) {
    await Promise.all(held.map((server) => new Promise((resolve) => server.close(resolve))));
    throw error;
  }
}

function answers(socketPath) {
  return new Promise((resolve) => {
    const probe = request({ socketPath, path: '/', timeout: 5_000 }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });
    probe.once('timeout', () => probe.destroy());
    probe.once('error', () => resolve(false));
    probe.end();
  });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Holds `port`, runs `beforeStart` (the build), then serves `entry` behind it. Resolves with
 * `{ url, child, close }` once the owned server answers; on any failure it stops what it started and rejects.
 */
export async function startOwnedServer({
  port,
  entry = '.output/server/index.mjs',
  cwd = process.cwd(),
  env = process.env,
  stdio = ['ignore', 'inherit', 'inherit'],
  beforeStart,
  timeoutMs = 60_000,
}) {
  const directory = mkdtempSync(join(tmpdir(), 'owned-server-'));
  const socketPath = join(directory, 'nitro.sock');
  const state = { ready: false, stopped: false };
  const proxy = (req, res) => {
    if (!state.ready) {
      res.writeHead(503, { 'content-type': 'text/plain' }).end(state.stopped ? STOPPED : STARTING);
      return;
    }
    const upstream = request({ socketPath, method: req.method, path: req.url, headers: req.headers }, (answer) => {
      res.writeHead(answer.statusCode, answer.statusMessage, answer.rawHeaders);
      answer.pipe(res);
    });
    upstream.once('error', () => (res.headersSent ? res.destroy() : res.writeHead(502).end(STOPPED)));
    res.once('close', () => upstream.destroy());
    req.pipe(upstream);
  };

  let held = [];
  let child;
  const close = async () => {
    state.ready = false;
    state.stopped = true;
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      await exited;
      clearTimeout(timer);
    }
    await Promise.all(
      held.map(
        (server) =>
          new Promise((resolve) => {
            server.close(resolve);
            server.closeAllConnections();
          }),
      ),
    );
    rmSync(directory, { recursive: true, force: true });
  };

  try {
    held = await holdPort(port, proxy);
    await beforeStart?.();
    child = spawn(process.execPath, [entry], { cwd, env: { ...env, NITRO_UNIX_SOCKET: socketPath }, stdio });
    child.once('exit', () => {
      state.ready = false;
      state.stopped = true;
    });
    const deadline = Date.now() + timeoutMs;
    while (!(await answers(socketPath)) || state.stopped) {
      if (state.stopped) throw new Error(`Owned server on port ${port} exited (${child.exitCode ?? child.signalCode}) before it answered.`);
      if (Date.now() > deadline) throw new Error(`Owned server on port ${port} did not answer within ${timeoutMs / 1000}s.`);
      await delay(250);
    }
    state.ready = true;
    return { url: `http://127.0.0.1:${port}`, child, close };
  } catch (error) {
    await close();
    throw error;
  }
}

/** Playwright `webServer` entry: Playwright waits for the ready line, so it never probes a URL another process may answer. */
export function ownedWebServer({ port, env, timeout, script = 'scripts/owned-server.mjs', entry }) {
  return {
    command: `node ${script} --build --port ${port}${entry ? ` --entry ${entry}` : ''}`,
    wait: { stdout: OWNED_SERVER_READY },
    timeout,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    env,
  };
}

function build() {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['build'], { stdio: ['ignore', 'inherit', 'inherit'] });
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`pnpm build failed with code ${code}.`))));
  });
}

async function main(argv) {
  const value = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  const port = Number(value('--port'));
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('--port must be an integer from 1024 to 65535.');
  const server = await startOwnedServer({
    port,
    entry: value('--entry') ?? '.output/server/index.mjs',
    beforeStart: argv.includes('--build') ? build : undefined,
  });
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(signal, () => server.close().then(() => process.exit(0)));
  process.stdout.write(`owned-server: ready ${server.url}\n`);
}

if (process.argv[1]?.endsWith('owned-server.mjs')) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`owned-server: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
