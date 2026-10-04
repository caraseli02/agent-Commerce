#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FEATURE_LIST_PATH="${FEATURE_LIST_PATH:-$ROOT_DIR/feature_list.json}"

FEATURE_LIST_PATH="$FEATURE_LIST_PATH" node <<'NODE'
const fs = require('fs');
const path = process.env.FEATURE_LIST_PATH;

function fail(message) {
  console.error(`feature_list.json validation failed: ${message}`);
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(path, 'utf8');
} catch (error) {
  console.error(`feature_list.json validation failed: cannot read ${path}. Check that the file exists at the repo root before running the harness validator.`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  console.error(`feature_list.json validation failed: file is not valid JSON. This blocks harness state checks because agents rely on machine-readable task state. Check ${path} for syntax errors.`);
  process.exit(1);
}

if (!data || typeof data !== 'object' || Array.isArray(data)) {
  fail(`top-level value must be a JSON object. The harness reads policy and feature entries from this file, so inspect ${path}.`);
}

const allowedStatuses = new Set(['not_started', 'active', 'blocked', 'passing']);
const features = Array.isArray(data.features) ? data.features : null;
const policy = data.policy && typeof data.policy === 'object' && !Array.isArray(data.policy) ? data.policy : null;
const errors = [];

if (!features) {
  errors.push('features must be an array. The validator cannot enforce WIP=1 or evidence rules without a feature list. Check the top-level "features" field.');
}

if (!policy) {
  errors.push('policy must be a JSON object. The harness uses policy.wip_limit and policy.active_feature_count to detect stale or conflicting task state. Check the top-level "policy" field.');
}

const DEFAULT_LANE = 'interactive';
const laneLimits = policy && policy.lanes !== undefined ? policy.lanes : null;
if (laneLimits !== null) {
  if (!laneLimits || typeof laneLimits !== 'object' || Array.isArray(laneLimits)) {
    errors.push('policy.lanes must be an object mapping lane names to integer WIP limits, for example {"interactive": 1, "nightly": 1}. Lanes keep WIP=1 per work stream; see docs/agents/autonomous-workflow.md.');
  } else {
    for (const [lane, limit] of Object.entries(laneLimits)) {
      if (!Number.isInteger(limit) || limit < 0) {
        errors.push(`policy.lanes.${lane} must be a non-negative integer WIP limit.`);
      }
    }
    if (!Object.prototype.hasOwnProperty.call(laneLimits, DEFAULT_LANE)) {
      errors.push(`policy.lanes must include "${DEFAULT_LANE}", the lane used by features without an explicit lane.`);
    }
  }
}
const laneActiveCounts = new Map();

if (features) {
  let activeCount = 0;
  for (const [index, feature] of features.entries()) {
    const location = `feature at index ${index}`;
    if (!feature || typeof feature !== 'object' || Array.isArray(feature)) {
      errors.push(`${location} is not a JSON object. Each feature must be a structured record so agents can safely read task state in ${path}.`);
      continue;
    }

    const id = typeof feature.id === 'string' && feature.id.trim() ? feature.id.trim() : null;
    const label = id ? `feature ${id}` : location;
    const status = feature.status;

    if (!allowedStatuses.has(status)) {
      errors.push(`${label} has invalid status ${JSON.stringify(status)}. Allowed statuses are not_started, active, blocked, passing. This keeps the harness task-state machine coherent; update the feature entry in ${path}.`);
    }

    const lane = feature.lane === undefined ? DEFAULT_LANE : feature.lane;
    if (feature.lane !== undefined && (typeof feature.lane !== 'string' || !feature.lane.trim())) {
      errors.push(`${label} has an invalid lane ${JSON.stringify(feature.lane)}. Omit lane for interactive work or use a lane declared in policy.lanes.`);
    } else if (laneLimits && typeof laneLimits === 'object' && !Array.isArray(laneLimits) && !Object.prototype.hasOwnProperty.call(laneLimits, lane)) {
      errors.push(`${label} uses lane ${JSON.stringify(lane)}, which is not declared in policy.lanes.`);
    } else if (!laneLimits && feature.lane !== undefined && lane !== DEFAULT_LANE) {
      errors.push(`${label} uses lane ${JSON.stringify(lane)}, but policy.lanes is not declared.`);
    }

    if (status === 'active') {
      activeCount += 1;
      laneActiveCounts.set(lane, (laneActiveCounts.get(lane) ?? 0) + 1);
    }

    if (status === 'passing') {
      if (!Array.isArray(feature.evidence) || feature.evidence.length === 0) {
        errors.push(`${label} is marked passing but has no evidence. Passing items must point to concrete proof so future agents know what validated the state; add one or more evidence entries in ${path}.`);
      }
    }
  }

  const wipLimit = policy && Number.isInteger(policy.wip_limit) ? policy.wip_limit : null;
  if (wipLimit == null) {
    errors.push('policy.wip_limit must be an integer. The harness needs an explicit WIP cap to enforce one active task at a time; check the top-level policy object.');
  } else if (activeCount > wipLimit) {
    errors.push(`${activeCount} feature(s) are active, but policy.wip_limit is ${wipLimit}. WIP=1 prevents parallel tasks from overlapping; reduce the number of active features in ${path}.`);
  }

  if (laneLimits && typeof laneLimits === 'object' && !Array.isArray(laneLimits)) {
    for (const [lane, count] of laneActiveCounts) {
      const limit = laneLimits[lane];
      if (Number.isInteger(limit) && count > limit) {
        errors.push(`${count} feature(s) are active in lane "${lane}", but policy.lanes.${lane} is ${limit}. Each lane keeps its own WIP limit; reduce active features in that lane in ${path}.`);
      }
    }
  }

  if (policy && Object.prototype.hasOwnProperty.call(policy, 'active_feature_count')) {
    if (!Number.isInteger(policy.active_feature_count)) {
      errors.push('policy.active_feature_count must be an integer if present. The field is redundant bookkeeping, so it must stay machine-checkable or be removed from policy.');
    } else if (policy.active_feature_count !== activeCount) {
      errors.push(`policy.active_feature_count is ${policy.active_feature_count}, but ${activeCount} feature(s) are actually active. This stale redundant count can hide WIP violations; update or remove the field in ${path}.`);
    }
  }

  if (!policy && features) {
    // no-op; the earlier policy error already explains the issue
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`feature_list.json validation failed: ${error}`);
  }
  process.exit(1);
}

const activeCount = features ? features.filter((feature) => feature && feature.status === 'active').length : 0;
const passingCount = features ? features.filter((feature) => feature && feature.status === 'passing').length : 0;
console.log(`feature_list.json OK: ${features ? features.length : 0} feature(s), ${activeCount} active, ${passingCount} passing.`);
NODE
