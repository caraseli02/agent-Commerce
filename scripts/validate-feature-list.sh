#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FEATURE_LIST_PATH="$ROOT_DIR/feature_list.json"

FEATURE_LIST_PATH="$FEATURE_LIST_PATH" node <<'NODE'
const fs = require('fs');
const path = process.env.FEATURE_LIST_PATH;

function fail(message) {
  console.error(`feature_list.json validation failed: ${message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (error) {
  fail(`cannot read valid JSON at ${path}. Restore the archive or fix its JSON syntax.`);
}

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const errors = [];
function fields(value, allowed, location) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      errors.push(`${location}.${key} is not an archive field. Live task status/claims belong only on GitHub issues and PRs; remove the field rather than synchronizing it.`);
    }
  }
}

if (!object(data)) fail('top-level value must be an archive object; inspect the repository feature_list.json.');
fields(data, ['schema_version', 'purpose', 'policy', 'archive'], 'root');
if (data.schema_version !== 2) errors.push('schema_version must be 2 (policy and historical evidence only; no per-task statuses).');
if (!text(data.purpose)) errors.push('purpose must describe the historical archive semantics.');

if (!object(data.policy)) {
  errors.push('policy must be an object containing the durable per-builder WIP rule and GitHub authority.');
} else {
  fields(data.policy, ['wip_limit_per_builder', 'live_claim_authority'], 'policy');
  if (data.policy.wip_limit_per_builder !== 1) errors.push('policy.wip_limit_per_builder must remain 1. Check live GitHub claims to enforce it.');
  if (data.policy.live_claim_authority !== 'GitHub issues and PRs') errors.push('policy.live_claim_authority must be "GitHub issues and PRs".');
}

if (!Array.isArray(data.archive)) {
  errors.push('archive must be an array of historical validation/evidence notes, never a task queue.');
} else {
  const ids = new Set();
  for (const [index, entry] of data.archive.entries()) {
    const location = `archive[${index}]`;
    if (!object(entry)) {
      errors.push(`${location} must be an object with id, description, validation and evidence.`);
      continue;
    }
    fields(entry, ['id', 'description', 'validation', 'evidence'], location);
    for (const key of ['id', 'description', 'validation']) {
      if (!text(entry[key])) errors.push(`${location}.${key} must be a nonempty string. Preserve the historical note's identity and validation context.`);
    }
    if (text(entry.id)) {
      if (ids.has(entry.id.trim())) errors.push(`${location}.id duplicates ${entry.id}. Keep historical identities unambiguous.`);
      ids.add(entry.id.trim());
    }
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0 || !entry.evidence.every(text)) {
      errors.push(`${location}.evidence must contain nonempty proof references or explicit historical evidence gaps; an archive entry is not a completion verdict.`);
    }
  }
}

if (errors.length) fail(errors.join('\n'));
console.log(`feature_list.json OK: ${data.archive.length} archived evidence note(s); live task state belongs only on GitHub issues and PRs.`);
NODE
