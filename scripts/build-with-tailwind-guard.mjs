#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process, { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { isCatalogIsrPreview } from '../helpers/catalog-isr-preview.mjs';

// Match Nuxt's .env defaults before selecting the completed-build protector.
try {
  loadEnvFile('.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const tailwindDiagnostics = /Unknown at rule: @(apply|reference)|Cannot apply unknown utility class/i;
const build = spawn('nuxt', ['build'], { stdio: ['inherit', 'pipe', 'pipe'] });
let output = '';

for (const stream of [build.stdout, build.stderr]) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  });
}

const code = await new Promise((resolve) => build.on('close', resolve));
if (code !== 0) process.exit(code ?? 1);

if (tailwindDiagnostics.test(output)) {
  console.error(
    'Tailwind build guard failed: production build reported an unknown @apply/@reference rule or utility. Check SFC style processing and @reference paths.',
  );
  process.exit(1);
}

await import('./verify-tailwind-output.mjs');

// Nitro's preset writes its final routes after nitro:compiled. Protect only
// after the child has exited successfully so that final output cannot overwrite
// the pre-cache gate. A malformed/unprotected candidate makes the build fail.
if (isCatalogIsrPreview()) {
  const { protectCatalogIsrOutput } = await import('../helpers/catalog-isr-output.ts');
  await protectCatalogIsrOutput(
    join(process.cwd(), '.vercel/output'),
    fileURLToPath(new URL('../server/catalog-isr-policy.mjs', import.meta.url)),
  );
  console.log('Catalog ISR Preview output protected: four anonymous assets, TTL30, pre-filesystem gate.');
}
