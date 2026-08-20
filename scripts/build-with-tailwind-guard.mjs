#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

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
