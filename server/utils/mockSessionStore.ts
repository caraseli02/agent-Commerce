import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type SessionEnvelope<T> = {
  value: T;
  updatedAt: number;
};

const DEFAULT_BASE_DIR = join(process.cwd(), '.data', 'mock-sessions');

export const getMockSessionStoreBaseDir = () => process.env.MOCK_SESSION_STORE_DIR || DEFAULT_BASE_DIR;

export const isMockSessionPersistenceEnabled = () => process.env.NUXT_PUBLIC_MOCK_MODE === 'true';

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, '_');

const namespacePath = (namespace: string) => join(getMockSessionStoreBaseDir(), namespace);

const filePathForKey = (namespace: string, key: string) => join(namespacePath(namespace), `${sanitizeKey(key)}.json`);

const ensureNamespaceDir = (namespace: string) => {
  const dir = namespacePath(namespace);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

export const loadSession = <T>(namespace: string, key: string): SessionEnvelope<T> | null => {
  if (!isMockSessionPersistenceEnabled()) {
    return null;
  }

  const filePath = filePathForKey(namespace, key);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as SessionEnvelope<T>;
  } catch {
    return null;
  }
};

export const saveSession = <T>(namespace: string, key: string, value: T, updatedAt: number) => {
  if (!isMockSessionPersistenceEnabled()) {
    return;
  }

  ensureNamespaceDir(namespace);
  const envelope: SessionEnvelope<T> = { value, updatedAt };
  writeFileSync(filePathForKey(namespace, key), JSON.stringify(envelope), 'utf8');
};

export const deleteSession = (namespace: string, key: string) => {
  if (!isMockSessionPersistenceEnabled()) {
    return;
  }

  const filePath = filePathForKey(namespace, key);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
};

export const purgeExpiredSessions = (namespace: string, ttlMs: number, maxEntries: number) => {
  if (!isMockSessionPersistenceEnabled()) {
    return;
  }

  const dir = namespacePath(namespace);
  if (!existsSync(dir)) {
    return;
  }

  const cutoff = Date.now() - ttlMs;
  const entries: Array<{ path: string; updatedAt: number }> = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const path = join(dir, file);

    try {
      const envelope = JSON.parse(readFileSync(path, 'utf8')) as SessionEnvelope<unknown>;
      if (envelope.updatedAt < cutoff) {
        unlinkSync(path);
        continue;
      }

      entries.push({ path, updatedAt: envelope.updatedAt });
    } catch {
      unlinkSync(path);
    }
  }

  if (entries.length <= maxEntries) {
    return;
  }

  entries.sort((a, b) => a.updatedAt - b.updatedAt);
  const overflow = entries.length - maxEntries;
  for (let i = 0; i < overflow; i++) {
    const entry = entries[i];
    if (entry) unlinkSync(entry.path);
  }
};

export const clearSessionNamespace = (namespace: string) => {
  const dir = namespacePath(namespace);
  if (!existsSync(dir)) {
    return;
  }

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) {
      continue;
    }

    unlinkSync(join(dir, file));
  }
};
