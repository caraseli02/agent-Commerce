import { spawn } from 'node:child_process';
import { open, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function command(
  program,
  args,
  { cwd, env = {}, input, log, controlLog, timeout = 120_000, limit = 100 * 1024 * 1024, started = () => {}, guard, capture = false } = {},
) {
  if (log) await mkdir(dirname(log), { recursive: true, mode: 0o700 });
  const file = log ? await open(log, 'a', 0o600) : null;
  const control = controlLog ? await open(controlLog, 'a', 0o600) : null;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(program, args, {
        cwd,
        env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', LANG: 'en_US.UTF-8', ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let bytes = 0;
      let output = '';
      let fault;
      let writing = Promise.resolve();
      const stop = (message) => {
        fault ??= new Error(message);
        child.kill('SIGKILL');
      };
      const timer = setTimeout(() => stop('Command timeout'), timeout);
      const guardTimer = guard
        ? setInterval(
            () =>
              Promise.resolve()
                .then(guard)
                .catch((error) => stop(error.message)),
            1000,
          )
        : null;
      for (const stream of [child.stdout, child.stderr])
        stream.on('data', (data) => {
          bytes += data.length;
          if (bytes > limit) {
            stop('Complete log limit exceeded');
            return;
          }
          const target = stream === child.stderr && control ? control : file;
          if (target) writing = writing.then(() => target.write(data)).catch(() => stop('Log write failed'));
          if (!target || capture) {
            if (bytes <= 2 * 1024 * 1024) output += data.toString();
            else stop('Command output limit exceeded');
          }
        });
      child.on('error', (error) => {
        fault = error;
      });
      child.on('close', async (code, signal) => {
        clearTimeout(timer);
        if (guardTimer) clearInterval(guardTimer);
        await writing;
        await start;
        if (fault) reject(fault);
        else resolve({ code, signal, output });
      });
      child.stdin.on('error', () => {});
      if (input !== undefined) child.stdin.end(input);
      // VM callers retain stdin as a parent-liveness pipe; ordinary commands get EOF.
      else if (!program.endsWith('/local-ci-vm')) child.stdin.end();
      const start = Promise.resolve()
        .then(() => started(child.pid))
        .catch((error) => stop(error.message));
    });
  } finally {
    await file?.close();
    await control?.close();
  }
}
