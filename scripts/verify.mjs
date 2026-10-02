#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';
import {
  documentationChanges,
  inputFingerprint,
  reusableReceipt,
  discardReceipt,
  recordReceipt,
  verificationEnvironment,
  assertPushedCheckout,
} from './verification-evidence.mjs';

const mode = process.argv.includes('--handoff') ? 'handoff' : process.argv.includes('--full') ? 'full' : 'fast';
const previewUrl = 'http://127.0.0.1:3000';
const previewArgs = ['.output/server/index.mjs'];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`$ ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: verificationEnvironment(),
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
    } catch {
      // Keep polling until the preview server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
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
    await run('node', ['scripts/smoke.mjs'], {
      env: {
        ...process.env,
        SMOKE_BASE_URL: previewUrl,
      },
    });
  } finally {
    if (!preview.killed) {
      preview.kill('SIGTERM');
    }

    const exit = await Promise.race([previewExit, new Promise((resolve) => setTimeout(() => resolve(null), 5000))]);

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
  const option = (name) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
  };
  const cwd = process.cwd();
  if (option('--head')) assertPushedCheckout(cwd, option('--head'));
  const docs = documentationChanges(cwd, option('--base') ?? (mode === 'handoff' ? 'origin/main' : undefined), option('--head') ?? 'HEAD');
  if (docs) {
    process.stdout.write('Documentation-only range: formatting and harness state checks; no application gate.\n');
    if (docs.length) await run('pnpm', ['exec', 'prettier', '--check', '--ignore-unknown', ...docs]);
    await run('bash', ['./scripts/validate-feature-list.sh']);
    if (mode === 'handoff') await run('node', ['scripts/check-clean-state.mjs']);
    return;
  }
  const fingerprint = inputFingerprint(cwd);
  const reuse =
    !process.argv.includes('--fresh') && (process.argv.includes('--reuse') || mode !== 'fast') && reusableReceipt(cwd, fingerprint);
  if (reuse) {
    process.stdout.write('Reusing matching local build/lint/typecheck/coverage evidence (less than four hours old).\n');
  } else {
    discardReceipt(cwd);
    await run('pnpm', ['build']);
    await run('node', ['scripts/check-bundle-size.mjs']);
    await run('pnpm', ['lint']);
    await run('pnpm', ['typecheck']);
    await run('pnpm', ['test:coverage']);
  }
  await run('bash', ['./scripts/validate-feature-list.sh']);
  await run('node', ['scripts/verify-ui-conventions.mjs']);

  if (mode === 'full' || mode === 'handoff') {
    await run('node', ['scripts/check-arch-invariants.mjs']);
    await runWithPreview();
  }

  if (mode === 'handoff') {
    await run('node', ['scripts/check-clean-state.mjs']);
  }

  if (fingerprint && fingerprint !== inputFingerprint(cwd))
    throw new Error('Verification inputs changed during the run. Rerun the gate against the current inputs.');
  if (reuse && !reusableReceipt(cwd, fingerprint)) throw new Error('Generated artifacts changed during verification. Rerun with --fresh.');
  if (!reuse) recordReceipt(cwd, fingerprint);

  console.log(`pnpm verify${mode === 'fast' ? '' : `:${mode}`} passed.`);
}

main().catch((error) => {
  discardReceipt(process.cwd());
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
