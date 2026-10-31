#!/usr/bin/env node
import { spawn } from 'node:child_process';
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
import { startOwnedServer } from './owned-server.mjs';
import { testPort } from './worktree-port.mjs';

const mode = process.argv.includes('--handoff') ? 'handoff' : process.argv.includes('--full') ? 'full' : 'fast';
const previewPort = testPort('smoke');

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

// The smoke preview holds its port itself (scripts/owned-server.mjs), so a colliding checkout fails the gate
// instead of being smoke-tested.
async function runWithPreview() {
  const preview = await startOwnedServer({
    port: previewPort,
    entry: '.output/server/index.mjs',
    env: { ...process.env, HOST: '127.0.0.1' },
  });
  try {
    await run('node', ['scripts/smoke.mjs'], {
      env: {
        ...process.env,
        SMOKE_BASE_URL: preview.url,
      },
    });
  } finally {
    await preview.close();
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
