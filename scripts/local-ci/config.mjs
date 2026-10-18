import { lstat, readFile, realpath, statfs } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function fileDigest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function trustedPath(path) {
  if (!isAbsolute(path) || (await realpath(path)) !== path) throw new Error('Trusted paths must be absolute and cannot contain symlinks');
  for (let part = path; ; part = dirname(part)) {
    const info = await lstat(part);
    if (info.uid !== 0 || info.mode & 0o022) throw new Error(`Trusted path is not root-owned and immutable: ${part}`);
    if (part === '/') break;
  }
}
export async function loadConfig(path) {
  await trustedPath(path);
  const cfg = JSON.parse(await readFile(path, 'utf8'));
  if (cfg.version !== 1 || cfg.repository !== 'caraseli02/agent-Commerce') throw new Error('Unsupported CI configuration');
  if (cfg.api !== undefined) throw new Error('Production GitHub API overrides are forbidden');
  if (cfg.enabled !== true) throw new Error('Standalone CI is disabled pending owner-approved deployment proof');
  if (process.getuid() === 0) throw new Error('CI services must run as separate standard accounts');
  for (const field of ['stateRoot', 'workerRoot', 'transitRoot', 'coordinatorSocket', 'workerSocket']) {
    if (!isAbsolute(cfg[field] ?? '')) throw new Error(`Missing absolute path: ${field}`);
  }
  for (const field of ['kernel', 'initrd', 'image', 'vmBinary']) {
    const asset = cfg[field];
    if (!asset || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Unpinned worker asset: ${field}`);
    await trustedPath(asset.path);
    if ((await fileDigest(asset.path)) !== asset.sha256) throw new Error(`Worker asset digest mismatch: ${field}`);
  }
  const release = fileURLToPath(new URL('.', import.meta.url));
  await trustedPath(release.slice(0, -1));
  const code = [];
  for (const name of [
    'config.mjs',
    'store.mjs',
    'github.mjs',
    'coordinator.mjs',
    'process.mjs',
    'worker.mjs',
    'service.mjs',
    'vm.swift',
    'guest-run.mjs',
    'evidence.mjs',
    'readiness.mjs',
    'attention.mjs',
    '../owner-attention.mjs',
    '../../.factory/factory.yaml',
    '../check-pr-template.mjs',
  ]) {
    await trustedPath(join(release, name));
    code.push(await fileDigest(join(release, name)));
  }
  cfg.policy = createHash('sha256')
    .update(
      JSON.stringify([
        code,
        ['kernel', 'initrd', 'image', 'vmBinary'].map((f) => cfg[f].sha256),
        [cfg.repository, cfg.appId, cfg.installationId, cfg.notifications === true],
        'networkless-vz-full-fresh-v2',
      ]),
    )
    .digest('hex');
  cfg.operationalProof = await readOperationalProof(cfg);
  if (!cfg.evidenceSocket || !isAbsolute(cfg.evidenceSocket)) throw new Error('Missing absolute read-only evidence socket');
  if (cfg.notifications !== undefined && typeof cfg.notifications !== 'boolean') throw new Error('Invalid notification activation setting');
  return cfg;
}
export async function readOperationalProof(cfg) {
  if (!cfg.operationalProofPath) return false;
  try {
    await trustedPath(cfg.operationalProofPath);
    const proof = JSON.parse(await readFile(cfg.operationalProofPath, 'utf8'));
    return (
      proof.version === 1 &&
      proof.policy === cfg.policy &&
      proof.acceptedBy === 'caraseli02' &&
      Number.isFinite(Date.parse(proof.acceptedAt)) &&
      ['isolation', 'cleanup', 'publication', 'reboot', 'notificationDelivery'].every(
        (key) => typeof proof.evidence?.[key] === 'string' && proof.evidence[key].trim().length > 0,
      )
    );
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
export async function capacity(path) {
  const fs = await statfs(path);
  if (Number(fs.bavail) * Number(fs.bsize) < 10 * 1024 ** 3) throw new Error('Less than 10 GiB free; CI dispatch blocked');
}
