#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const maxRoutes = Number(process.env.SMOKE_MAX_ROUTES ?? 3);
const preferredOrder = ['/', '/products', '/shop', '/cart', '/checkout', '/about', '/contact', '/blog'];

function toRoute(filePath) {
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  if (!rel.startsWith('pages/') || !rel.endsWith('.vue')) return null;
  if (rel.includes('[') || rel.includes(']')) return null;

  const noExt = rel.slice('pages/'.length, -4);
  if (noExt === 'index') return '/';
  if (noExt.endsWith('/index')) return `/${noExt.slice(0, -6)}`;
  return `/${noExt}`;
}

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

const files = await walk(path.join(process.cwd(), 'pages'));
const staticRoutes = [...new Set(files.map(toRoute).filter(Boolean))];
const ranked = preferredOrder.filter((route) => staticRoutes.includes(route));
for (const route of staticRoutes) {
  if (ranked.length >= maxRoutes) break;
  if (!ranked.includes(route)) ranked.push(route);
}
const routes = ranked.slice(0, maxRoutes);

if (routes.length === 0) {
  console.error('No static routes found under pages/.');
  process.exit(1);
}

console.log(`Smoke target: ${baseUrl}`);
console.log(`Routes: ${routes.join(', ')}`);

const failures = [];
for (const route of routes) {
  const url = `${baseUrl}${route}`;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    const body = await response.text();
    const ok = response.ok && body.length > 0;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${route} -> ${response.status}`);
    if (!ok) {
      failures.push(`${route} -> ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL ${route} -> ${message}`);
    failures.push(`${route} -> ${message}`);
  }
}

if (failures.length > 0) {
  console.error('Smoke check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Smoke check passed.');
