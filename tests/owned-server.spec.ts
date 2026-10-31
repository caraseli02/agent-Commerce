import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OWNED_SERVER_READY, startOwnedServer } from '../scripts/owned-server.mjs';

// A peer checkout's server: answers PEER CHECKOUT and records every request it receives, standing in for
// another checkout's application and database.
const PEER = `
import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
const [port, log] = process.argv.slice(2);
for (const host of ['127.0.0.1', '::1']) {
  createServer((req, res) => { appendFileSync(log, 'hit ' + req.url + '\\n'); res.end('PEER CHECKOUT'); })
    .once('error', (error) => appendFileSync(log, 'bind-failed ' + host + ' ' + error.code + '\\n'))
    .listen(Number(port), host, () => appendFileSync(log, 'listening ' + host + '\\n'));
}
setTimeout(() => {}, 60_000);
`;
// The owned app, served on the Unix socket the owner gives it.
const APP = `
import { createServer } from 'node:http';
createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk)).on('end', () => {
    res.setHeader('set-cookie', ['a=1', 'b=2']);
    res.end(req.method === 'POST' ? 'OWNED ' + req.headers.host + ' ' + body : 'OWNED');
  });
}).listen(process.env.NITRO_UNIX_SOCKET);
`;

const root = join(process.cwd(), 'test-results');
const cleanups: Array<() => unknown> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

function workspace() {
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, 'owned-server-'));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'peer.mjs'), PEER);
  writeFileSync(join(dir, 'app.mjs'), APP);
  return dir;
}

async function freePort() {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

const peerLog = (log: string) => (existsSync(log) ? readFileSync(log, 'utf8') : '');

/** Starts a peer checkout in its own process and waits until it holds (or failed to bind) the port. */
async function startPeer(dir: string, port: number) {
  const log = join(dir, `peer-${port}-${Date.now()}.log`);
  const child = spawn(process.execPath, [join(dir, 'peer.mjs'), String(port), log], { stdio: 'ignore' });
  cleanups.push(() => child.kill('SIGKILL'));
  await vi.waitFor(() => expect(peerLog(log).match(/^(listening|bind-failed) /gm)?.length).toBeGreaterThanOrEqual(1), { timeout: 5_000 });
  return log;
}

async function peerBindFails(port: number, host: string) {
  const peer: Server = createServer((_req, res) => res.end('PEER CHECKOUT'));
  return new Promise<string>((resolve) => {
    peer.once('error', (error: NodeJS.ErrnoException) => resolve(error.code ?? 'error'));
    peer.listen(port, host, () => peer.close(() => resolve('bound')));
  });
}

describe('owned test servers', () => {
  it('stops before building when another checkout already holds the port, and never contacts it', async () => {
    const dir = workspace();
    const port = await freePort();
    const log = await startPeer(dir, port);
    expect(peerLog(log)).toContain('listening 127.0.0.1');
    const build = vi.fn();

    await expect(startOwnedServer({ port, entry: join(dir, 'app.mjs'), beforeStart: build })).rejects.toThrow(/already in use/);
    expect(build).not.toHaveBeenCalled();
    expect(peerLog(log)).not.toContain('hit');
  });

  it('holds the port through the build, so a checkout starting meanwhile can neither bind nor answer', async () => {
    const dir = workspace();
    const port = await freePort();
    let duringBuild: { log: string; ipv4: string; ipv6: string; status: number; body: string } | undefined;
    const server = await startOwnedServer({
      port,
      entry: join(dir, 'app.mjs'),
      beforeStart: async () => {
        const log = await startPeer(dir, port);
        const response = await fetch(`http://127.0.0.1:${port}/`);
        duringBuild = {
          log,
          ipv4: await peerBindFails(port, '127.0.0.1'),
          ipv6: await peerBindFails(port, '::1'),
          status: response.status,
          body: await response.text(),
        };
      },
    });
    cleanups.push(server.close);

    expect(peerLog(duringBuild!.log)).toMatch(/bind-failed 127\.0\.0\.1 EADDRINUSE/);
    expect(duringBuild!.ipv4).toBe('EADDRINUSE');
    expect(['EADDRINUSE', 'EADDRNOTAVAIL', 'EAFNOSUPPORT']).toContain(duringBuild!.ipv6);
    expect([duringBuild!.status, duringBuild!.body]).toEqual([503, 'Owned test server is starting.']);
    for (const host of ['127.0.0.1', 'localhost']) expect(await (await fetch(`http://${host}:${port}/`)).text()).toBe('OWNED');
    expect(peerLog(duringBuild!.log)).not.toContain('hit');
  });

  it('proxies requests faithfully and keeps the port held with 503s after the owned server exits', async () => {
    const dir = workspace();
    const port = await freePort();
    const server = await startOwnedServer({ port, entry: join(dir, 'app.mjs') });
    cleanups.push(server.close);

    const posted = await fetch(`${server.url}/api/echo`, { method: 'POST', body: 'payload' });
    expect(await posted.text()).toBe(`OWNED 127.0.0.1:${port} payload`);
    expect(posted.headers.getSetCookie()).toEqual(['a=1', 'b=2']);

    const exited = new Promise((resolve) => server.child.once('exit', resolve));
    server.child.kill('SIGKILL');
    await exited;
    expect(await peerBindFails(port, '127.0.0.1')).toBe('EADDRINUSE');
    const after = await fetch(server.url);
    expect([after.status, await after.text()]).toEqual([503, 'Owned test server has stopped.']);

    await server.close();
    expect(await peerBindFails(port, '127.0.0.1')).toBe('bound');
  });

  it('fails and releases the port when the owned server exits before answering', async () => {
    const dir = workspace();
    const port = await freePort();
    writeFileSync(join(dir, 'crash.mjs'), 'process.exit(3);');
    await expect(startOwnedServer({ port, entry: join(dir, 'crash.mjs') })).rejects.toThrow(/exited \(3\) before it answered/);
    expect(await peerBindFails(port, '127.0.0.1')).toBe('bound');
  });
});

describe('Playwright configs', () => {
  it('start every internally managed server through the owner and wait for its ready line, never a URL', async () => {
    const configs = [
      (await import('../playwright.config')).default,
      (await import('../playwright.visual.config')).default,
      (await import('../playwright.parity.config')).default,
    ];
    for (const loaded of configs) {
      expect(loaded.webServer.command).toMatch(/^node scripts\/owned-server\.mjs --build --port \d+$/);
      expect(loaded.webServer.wait.stdout).toBe(OWNED_SERVER_READY);
      expect(loaded.webServer).not.toHaveProperty('url');
      expect(loaded.webServer).not.toHaveProperty('port');
    }
  });

  it('keep the explicit external URL behaviour for e2e and parity', async () => {
    vi.stubEnv('PLAYWRIGHT_BASE_URL', 'http://127.0.0.1:3205');
    vi.stubEnv('PARITY_BASE_URL', 'http://127.0.0.1:3206');
    vi.resetModules();
    try {
      const e2e = (await import('../playwright.config.ts?external')).default;
      const parity = (await import('../playwright.parity.config.ts?external')).default;
      expect([e2e.webServer, e2e.use?.baseURL]).toEqual([undefined, 'http://127.0.0.1:3205']);
      expect([parity.webServer, parity.use?.baseURL]).toEqual([undefined, 'http://127.0.0.1:3206']);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('a Playwright run beside a colliding checkout', () => {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');

  // Runs Playwright in its own process against an owned server whose "build" is a pnpm shim.
  function playwright(dir: string, port: number, build: string) {
    const bin = join(dir, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'pnpm'), `#!/bin/sh\n${build}\n`);
    chmodSync(join(bin, 'pnpm'), 0o755);
    const owner = join(process.cwd(), 'scripts/owned-server.mjs');
    writeFileSync(
      join(dir, 'playwright.config.mjs'),
      [
        `import { ownedWebServer } from ${JSON.stringify(owner)};`,
        `export default { testDir: '.', outputDir: 'out', reporter: 'line', use: { baseURL: 'http://localhost:${port}' },`,
        `  webServer: ownedWebServer({ port: ${port}, timeout: 30_000, script: ${JSON.stringify(owner)}, entry: ${JSON.stringify(join(dir, 'app.mjs'))} }) };`,
      ].join('\n'),
    );
    writeFileSync(
      join(dir, 'owned.spec.mjs'),
      `import { expect, test } from '@playwright/test';\ntest('reaches only the owned app', async ({ request }) => expect(await (await request.get('/')).text()).toBe('OWNED'));\n`,
    );
    return spawnSync(process.execPath, [cli, 'test', '--config', join(dir, 'playwright.config.mjs')], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CI: '' },
      timeout: 60_000,
    });
  }

  it('fails closed when the peer holds the port before the run starts', async () => {
    const dir = workspace();
    const port = await freePort();
    const log = await startPeer(dir, port);
    const run = playwright(dir, port, `touch ${join(dir, 'built')}`);

    expect(run.status).not.toBe(0);
    expect(run.stdout + run.stderr).toMatch(/already in use; refusing to test another process's server/);
    expect(existsSync(join(dir, 'built'))).toBe(false);
    expect(peerLog(log)).not.toContain('hit');
  }, 60_000);

  it('tests only its own server when the peer starts during the build', async () => {
    const dir = workspace();
    const port = await freePort();
    const log = join(dir, 'peer-during.log');
    const run = playwright(dir, port, `"${process.execPath}" "${join(dir, 'peer.mjs')}" ${port} "${log}" & sleep 2`);

    expect(run.stdout + run.stderr).toContain('1 passed');
    expect(run.status).toBe(0);
    expect(peerLog(log)).toMatch(/bind-failed 127\.0\.0\.1 EADDRINUSE/);
    expect(peerLog(log)).not.toContain('hit');
    spawnSync('pkill', ['-f', `${join(dir, 'peer.mjs')} ${port}`]);
  }, 60_000);
});
