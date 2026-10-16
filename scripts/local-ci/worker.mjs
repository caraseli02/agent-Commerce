import { createServer, request } from 'node:http';
import { chmod, copyFile, lstat, mkdir, readFile, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { capacity, fileDigest } from './config.mjs';
import { command } from './process.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha = /^[a-f0-9]{40}$/;
export function validateSpec(spec) {
  if (!uuid.test(spec.id) || !sha.test(spec.head) || !sha.test(spec.base) || !/^[a-f0-9]{64}$/.test(spec.policy))
    throw new Error('Invalid worker job identity');
}
export function rpc(socketPath, path, data) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path,
        method: data === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 50 * 60_000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1024 * 1024) req.destroy(new Error('Supervisor response too large'));
        });
        res.on('end', () => {
          try {
            const value = JSON.parse(body);
            if (res.statusCode !== 200) reject(new Error(value.error ?? 'Supervisor unavailable'));
            else resolve(value);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Supervisor transport timed out')));
    req.end(data === undefined ? undefined : JSON.stringify(data));
  });
}

// The coordinator fetches source; only credential-free bundles cross the boundary.
export class WorkerClient {
  constructor(cfg, github) {
    this.cfg = cfg;
    this.github = github;
  }
  async recover() {
    return (await rpc(this.cfg.workerSocket, '/recover')).cleaned === true;
  }
  async run(spec) {
    validateSpec(spec);
    await capacity(this.cfg.stateRoot);
    const bare = join(this.cfg.stateRoot, `source-${spec.id}`);
    const bundle = join(this.cfg.transitRoot, `${spec.id}.bundle`);
    try {
      await mkdir(bare, { mode: 0o700 });
      const token = await this.github.token();
      const env = {
        HOME: this.cfg.stateRoot,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_TERMINAL_PROMPT: '0',
        GIT_CONFIG_COUNT: '4',
        GIT_CONFIG_KEY_0: 'core.hooksPath',
        GIT_CONFIG_VALUE_0: '/dev/null',
        GIT_CONFIG_KEY_1: 'credential.helper',
        GIT_CONFIG_VALUE_1: '',
        GIT_CONFIG_KEY_2: 'protocol.file.allow',
        GIT_CONFIG_VALUE_2: 'never',
        GIT_CONFIG_KEY_3: 'http.https://github.com/.extraheader',
        GIT_CONFIG_VALUE_3: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
      };
      const git = async (args) => {
        const result = await command('/usr/bin/git', args, {
          cwd: bare,
          env,
          limit: 2 * 1024 * 1024,
          timeout: 180_000,
          guard: () => capacity(this.cfg.stateRoot),
        });
        if (result.code !== 0) throw new Error('Trusted source preparation failed; no PR code was executed');
        return result;
      };
      await git(['init', '--bare', '.']);
      await git([
        'fetch',
        '--no-tags',
        `https://github.com/${this.cfg.repository}.git`,
        `${spec.head}:refs/heads/head`,
        `${spec.base}:refs/heads/base`,
      ]);
      for (const ref of ['head', 'base']) {
        if ((await git(['rev-parse', `refs/heads/${ref}`])).output.trim() !== spec[ref])
          throw new Error('Fetched commit does not match requested SHA');
      }
      await git(['bundle', 'create', bundle, '--all']);
      await chmod(bundle, 0o640);
      const bundleDigest = await fileDigest(bundle);
      return await rpc(this.cfg.workerSocket, '/run', { id: spec.id, head: spec.head, base: spec.base, policy: spec.policy, bundleDigest });
    } finally {
      await rm(bare, { recursive: true, force: true });
      await rm(bundle, { force: true });
    }
  }
}

export class Supervisor {
  constructor(cfg) {
    this.cfg = cfg;
    this.busy = false;
    this.blocked = false;
  }
  async recover() {
    if (this.busy) return false;
    for (const name of await readdir(this.cfg.workerRoot)) {
      if (!uuid.test(name)) continue;
      const dir = join(this.cfg.workerRoot, name);
      let record;
      try {
        record = JSON.parse(await readFile(join(dir, 'process.json'), 'utf8'));
      } catch {
        this.blocked = true;
        return false;
      }
      if (record.pid) {
        try {
          process.kill(record.pid, 0);
          return false;
        } catch (error) {
          if (error.code !== 'ESRCH') return false;
        }
      } else if (!record.stopped) {
        this.blocked = true;
        return false;
      }
      // Parent-liveness pipe makes a supervisor crash terminate its VZ process.
      // A still-alive/reused PID is conservatively never killed or adopted.
      await rm(dir, { recursive: true });
    }
    this.blocked = false;
    return true;
  }
  async run(spec) {
    validateSpec(spec);
    if (spec.policy !== this.cfg.policy) throw new Error('Coordinator and supervisor policy differ');
    if (this.busy || this.blocked || !(await this.recover())) throw new Error('Worker busy or unresolved cleanup');
    this.busy = true;
    const dir = join(this.cfg.workerRoot, spec.id);
    let stopped = true;
    let cleaned = false;
    let state = 'error';
    let detail = 'Worker did not complete';
    let merge = null;
    try {
      await capacity(this.cfg.workerRoot);
      const bundle = join(this.cfg.transitRoot, `${spec.id}.bundle`);
      const info = await lstat(bundle);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 1024 ** 3 || (await fileDigest(bundle)) !== spec.bundleDigest)
        throw new Error('Invalid source bundle');
      await mkdir(dir, { mode: 0o700 });
      await writeFile(join(dir, 'process.json'), JSON.stringify({ stopped: true }), { mode: 0o600 });
      const input = join(dir, 'seed');
      await mkdir(input, { mode: 0o700 });
      await copyFile(bundle, join(input, 'source.bundle'), constants.COPYFILE_EXCL);
      await writeFile(join(input, 'job.json'), JSON.stringify(spec), { mode: 0o600 });
      const disk = join(dir, 'root.raw');
      // APFS clone is bounded by the image's fixed virtual size and this job's lifetime.
      const clone = await command('/bin/cp', ['-c', this.cfg.image.path, disk]);
      if (clone.code !== 0) throw new Error('APFS clone failed');
      if ((await stat(disk)).size > 12 * 1024 ** 3) throw new Error('Worker image exceeds 12 GiB disk bound');
      const iso = join(dir, 'input.iso');
      const seed = await command('/usr/bin/hdiutil', ['makehybrid', '-iso', '-joliet', '-o', iso, input]);
      if (seed.code !== 0) throw new Error('Read-only input image creation failed');
      await writeFile(
        join(dir, 'vm.json'),
        JSON.stringify({ kernel: this.cfg.kernel.path, initrd: this.cfg.initrd.path, disk, input: iso }),
      );
      await writeFile(join(dir, 'process.json'), JSON.stringify({ stopped: false }), { mode: 0o600 });
      stopped = false;
      const result = await command(this.cfg.vmBinary.path, [join(dir, 'vm.json')], {
        timeout: 45 * 60_000,
        log: join(this.cfg.workerRoot, `${spec.id}.log`),
        controlLog: join(this.cfg.workerRoot, `${spec.id}.control`),
        limit: 100 * 1024 * 1024,
        started: (pid) => writeFile(join(dir, 'process.json'), JSON.stringify({ pid }), { mode: 0o600 }),
        guard: () => capacity(this.cfg.workerRoot),
      }).finally(() => {
        stopped = true;
      });
      const log = await readFile(join(this.cfg.workerRoot, `${spec.id}.control`), 'utf8');
      const frames = [...log.matchAll(/LOCAL_CI_RESULT ([^\r\n]+)/g)];
      if (result.code !== 0 || frames.length !== 1) throw new Error('VM crash or missing/ambiguous trusted control outcome');
      const report = JSON.parse(frames[0][1]);
      if (
        report.id !== spec.id ||
        report.head !== spec.head ||
        report.base !== spec.base ||
        !sha.test(report.merge) ||
        ![0, 1, 2].includes(report.exit)
      )
        throw new Error('Invalid VM outcome');
      state = report.exit === 0 ? 'success' : report.exit === 1 ? 'failure' : 'error';
      detail = report.detail;
      merge = report.merge;
    } catch (error) {
      detail = error.message;
    } finally {
      if (stopped) {
        try {
          await rm(dir, { recursive: true, force: true });
          cleaned = true;
        } catch {
          this.blocked = true;
        }
      } else this.blocked = true;
      this.busy = false;
    }
    return { state: cleaned ? state : 'error', cleaned, detail, merge, log: `${spec.id}.log` };
  }
}

export async function listen(socketPath, handler, mode = 0o600) {
  // Do not unlink a listening socket and admit a second coordinator/supervisor.
  try {
    await rpc(socketPath, '/health');
    throw new Error('Service already running');
  } catch (error) {
    if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error;
    await unlink(socketPath).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });
  }
  const server = createServer(async (req, res) => {
    try {
      let body = '';
      for await (const data of req) {
        body += data;
        if (body.length > 32 * 1024) throw new Error('Request too large');
      }
      const value = await handler(req.method, req.url, body ? JSON.parse(body) : undefined);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    } catch (error) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  await chmod(socketPath, mode);
  return server;
}
