#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';

const previewUrl = 'http://127.0.0.1:3000';
const previewArgs = ['.output/server/index.mjs'];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
      ...options,
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
    });
  });
}

async function waitForPreview(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await response.text();
        return;
      }
    }
    catch {
      // Keep polling until the preview server is ready.
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function runWithPreview() {
  const preview = spawn('node', previewArgs, {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '3000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let previewLogs = '';
  preview.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    previewLogs += chunk.toString();
  });
  preview.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    previewLogs += chunk.toString();
  });

  const previewExit = once(preview, 'close');

  try {
    await waitForPreview(previewUrl);
    await run('pnpm', ['smoke'], {
      env: {
        ...process.env,
        SMOKE_BASE_URL: previewUrl,
      },
    });
  }
  finally {
    if (!preview.killed) {
      preview.kill('SIGTERM');
    }

    const exit = await Promise.race([previewExit, new Promise(resolve => setTimeout(() => resolve(null), 5000))]);

    if (exit === null && !preview.killed) {
      preview.kill('SIGKILL');
      await previewExit.catch(() => undefined);
    }
  }

  if (preview.exitCode !== 0 && preview.exitCode !== null) {
    throw new Error(`pnpm preview failed with code ${preview.exitCode}. Logs:\n${previewLogs}`);
  }
}

async function main() {
  await run('pnpm', ['build']);
  await run('pnpm', ['lint']);
  await run('pnpm', ['typecheck']);
  await run('pnpm', ['test']);
  await run('bash', ['./scripts/validate-feature-list.sh']);
  await run('node', ['scripts/check-arch-invariants.mjs']);
  await run('node', ['scripts/check-clean-state.mjs']);
  await runWithPreview();
  console.log('pnpm verify passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
