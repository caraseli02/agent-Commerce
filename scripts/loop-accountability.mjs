#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const ACTION_KINDS = new Set(['file', 'command']);
const FILE_ACCESS = new Set(['read', 'write']);
const STOP_REASONS = new Set(['accepted', 'rejected', 'budget_exhausted', 'blocked', 'cancelled', 'error']);
const VERDICTS = new Set(['PASS', 'FAIL', 'BLOCKED']);

export class LoopAccountabilityError extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'LoopAccountabilityError';
    this.errors = errors;
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidIsoDate(value) {
  return isNonEmptyString(value) && ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isSafeRelativePath(value) {
  if (!isNonEmptyString(value) || value.startsWith('/') || value.includes('\\')) {
    return false;
  }

  const segments = value.split('/');
  return !segments.includes('.') && !segments.includes('..') && !segments.includes('');
}

function matchesScope(value, scope) {
  if (scope === '.') {
    return true;
  }

  if (scope.endsWith('*')) {
    return value.startsWith(scope.slice(0, -1));
  }

  if (scope.endsWith('/')) {
    return value.startsWith(scope);
  }

  return value === scope;
}

function matchesAnyScope(value, scopes) {
  return scopes.some((scope) => matchesScope(value, scope));
}

function recordPrefix(lineNumber, runId) {
  return `line ${lineNumber}, run ${isNonEmptyString(runId) ? runId : '<unknown>'}`;
}

function addError(errors, prefix, message) {
  errors.push(`${prefix}: ${message}`);
}

function validateIdentity(record, prefix, errors) {
  if (record.schema_version !== 1) {
    addError(errors, prefix, 'schema_version must be 1');
  }

  if (!isNonEmptyString(record.run_id)) {
    addError(errors, prefix, 'run_id must be a non-empty string');
  }

  if (!isObject(record.agent)) {
    addError(errors, prefix, 'agent must be an object');
  } else {
    if (!isNonEmptyString(record.agent.id)) {
      addError(errors, prefix, 'agent.id must be a non-empty string');
    }
    if (!isNonEmptyString(record.agent.role)) {
      addError(errors, prefix, 'agent.role must be a non-empty string');
    }
  }

  if (!isObject(record.work)) {
    addError(errors, prefix, 'work must be an object');
  } else {
    if (!Number.isInteger(record.work.issue) || record.work.issue <= 0) {
      addError(errors, prefix, 'work.issue must be a positive integer');
    }
    if (!isNonEmptyString(record.work.branch)) {
      addError(errors, prefix, 'work.branch must be a non-empty string');
    }
    if (!isNonEmptyString(record.work.head_sha) || !SHA_PATTERN.test(record.work.head_sha)) {
      addError(errors, prefix, 'work.head_sha must be a 40-character Git SHA');
    }
  }
}

function validatePermissions(record, prefix, errors) {
  const permissions = record.permissions;
  if (!isObject(permissions)) {
    addError(errors, prefix, 'permissions must be an object');
    return;
  }

  for (const field of ['read_paths', 'write_paths', 'denied_paths', 'commands', 'denied_commands']) {
    if (!isStringArray(permissions[field])) {
      addError(errors, prefix, `permissions.${field} must be an array of non-empty strings`);
    }
  }

  for (const field of ['read_paths', 'write_paths', 'denied_paths']) {
    if (!isStringArray(permissions[field])) {
      continue;
    }

    for (const scope of permissions[field]) {
      const pathPart = scope.endsWith('*') ? scope.slice(0, -1) : scope;
      if (pathPart !== '.' && !isSafeRelativePath(pathPart.endsWith('/') ? pathPart.slice(0, -1) : pathPart)) {
        addError(errors, prefix, `permissions.${field} contains unsafe repo-relative scope "${scope}"`);
      }
    }
  }
}

function validateBudgets(record, prefix, errors) {
  const budgets = record.budgets;
  const usage = record.usage;

  if (!isObject(budgets)) {
    addError(errors, prefix, 'budgets must be an object');
  } else {
    if (!Number.isInteger(budgets.max_iterations) || budgets.max_iterations <= 0) {
      addError(errors, prefix, 'budgets.max_iterations must be a positive integer');
    }
    if (!Number.isInteger(budgets.max_tokens) || budgets.max_tokens <= 0) {
      addError(errors, prefix, 'budgets.max_tokens must be a positive integer');
    }
    if (!isPositiveNumber(budgets.max_cost_usd)) {
      addError(errors, prefix, 'budgets.max_cost_usd must be a positive number');
    }
  }

  if (!isObject(usage)) {
    addError(errors, prefix, 'usage must be an object');
    return;
  }

  if (!Number.isInteger(usage.iterations) || usage.iterations < 0) {
    addError(errors, prefix, 'usage.iterations must be a non-negative integer');
  }
  if (!Number.isInteger(usage.tokens) || usage.tokens < 0) {
    addError(errors, prefix, 'usage.tokens must be a non-negative integer');
  }
  if (!isNonNegativeNumber(usage.cost_usd)) {
    addError(errors, prefix, 'usage.cost_usd must be a non-negative number');
  }

  if (!isObject(budgets)) {
    return;
  }

  const comparisons = [
    ['iterations', 'max_iterations'],
    ['tokens', 'max_tokens'],
    ['cost_usd', 'max_cost_usd'],
  ];

  for (const [usageField, budgetField] of comparisons) {
    const used = usage[usageField];
    const maximum = budgets[budgetField];
    if (isNonNegativeNumber(used) && isPositiveNumber(maximum) && used > maximum) {
      addError(errors, prefix, `usage.${usageField} ${used} exceeds budgets.${budgetField} ${maximum}`);
    }
  }
}

function validateFileAction(action, index, permissions, prefix, errors) {
  if (!FILE_ACCESS.has(action.access)) {
    addError(errors, prefix, `actions[${index}].access must be read or write`);
    return;
  }

  if (!isSafeRelativePath(action.target)) {
    addError(errors, prefix, `actions[${index}].target must be a safe repo-relative path`);
    return;
  }

  if (!isObject(permissions)) {
    return;
  }

  const deniedPaths = isStringArray(permissions.denied_paths) ? permissions.denied_paths : [];
  if (matchesAnyScope(action.target, deniedPaths)) {
    addError(errors, prefix, `${action.access} target "${action.target}" matches permissions.denied_paths`);
    return;
  }

  const allowedField = action.access === 'read' ? 'read_paths' : 'write_paths';
  const allowedPaths = isStringArray(permissions[allowedField]) ? permissions[allowedField] : [];
  if (!matchesAnyScope(action.target, allowedPaths)) {
    addError(errors, prefix, `${action.access} target "${action.target}" is outside permissions.${allowedField}`);
  }
}

function validateCommandAction(action, index, permissions, prefix, errors) {
  if (!isNonEmptyString(action.command)) {
    addError(errors, prefix, `actions[${index}].command must be a non-empty string`);
    return;
  }
  if (!Number.isInteger(action.exit_code)) {
    addError(errors, prefix, `actions[${index}].exit_code must be an integer`);
  }

  if (!isObject(permissions)) {
    return;
  }

  const deniedCommands = isStringArray(permissions.denied_commands) ? permissions.denied_commands : [];
  if (matchesAnyScope(action.command, deniedCommands)) {
    addError(errors, prefix, `command "${action.command}" matches permissions.denied_commands`);
    return;
  }

  const allowedCommands = isStringArray(permissions.commands) ? permissions.commands : [];
  if (!matchesAnyScope(action.command, allowedCommands)) {
    addError(errors, prefix, `command "${action.command}" is outside permissions.commands`);
  }
}

function validateActions(record, prefix, errors) {
  if (!Array.isArray(record.actions)) {
    addError(errors, prefix, 'actions must be an array');
    return null;
  }

  let previousTimestamp = null;

  for (const [index, action] of record.actions.entries()) {
    if (!isObject(action)) {
      addError(errors, prefix, `actions[${index}] must be an object`);
      continue;
    }

    const expectedSequence = index + 1;
    if (action.sequence !== expectedSequence) {
      addError(errors, prefix, `actions[${index}].sequence must be ${expectedSequence}`);
    }
    if (!isValidIsoDate(action.at)) {
      addError(errors, prefix, `actions[${index}].at must be an ISO-8601 UTC timestamp`);
    } else if (previousTimestamp !== null && Date.parse(action.at) < previousTimestamp) {
      addError(errors, prefix, `actions[${index}].at must not be earlier than the previous action`);
    } else {
      previousTimestamp = Date.parse(action.at);
    }

    if (!ACTION_KINDS.has(action.kind)) {
      addError(errors, prefix, `actions[${index}].kind must be file or command`);
    } else if (action.kind === 'file') {
      validateFileAction(action, index, record.permissions, prefix, errors);
    } else {
      validateCommandAction(action, index, record.permissions, prefix, errors);
    }
  }

  return previousTimestamp;
}

function validateOutcome(record, prefix, errors, lastActionTimestamp) {
  let stopTimestamp = null;
  if (!isObject(record.stop)) {
    addError(errors, prefix, 'stop must be an object');
  } else {
    if (!STOP_REASONS.has(record.stop.reason)) {
      addError(errors, prefix, `stop.reason must be one of ${[...STOP_REASONS].join(', ')}`);
    }
    if (!isValidIsoDate(record.stop.at)) {
      addError(errors, prefix, 'stop.at must be an ISO-8601 UTC timestamp');
    } else {
      stopTimestamp = Date.parse(record.stop.at);
      if (lastActionTimestamp !== null && stopTimestamp < lastActionTimestamp) {
        addError(errors, prefix, 'stop.at must not be earlier than the last action');
      }
    }
  }

  if (!isObject(record.evaluation)) {
    addError(errors, prefix, 'evaluation must be an object');
  } else {
    if (!isNonEmptyString(record.evaluation.agent_id)) {
      addError(errors, prefix, 'evaluation.agent_id must be a non-empty string');
    }
    if (isObject(record.agent) && record.evaluation.agent_id === record.agent.id) {
      addError(errors, prefix, 'evaluation.agent_id must differ from agent.id');
    }
    if (!SHA_PATTERN.test(record.evaluation.head_sha ?? '')) {
      addError(errors, prefix, 'evaluation.head_sha must be a 40-character Git SHA');
    } else if (isObject(record.work) && record.evaluation.head_sha !== record.work.head_sha) {
      addError(errors, prefix, 'evaluation.head_sha must match work.head_sha');
    }
    if (!VERDICTS.has(record.evaluation.verdict)) {
      addError(errors, prefix, `evaluation.verdict must be one of ${[...VERDICTS].join(', ')}`);
    }
    if (!isValidIsoDate(record.evaluation.at)) {
      addError(errors, prefix, 'evaluation.at must be an ISO-8601 UTC timestamp');
    } else if (stopTimestamp !== null && Date.parse(record.evaluation.at) < stopTimestamp) {
      addError(errors, prefix, 'evaluation.at must not be earlier than stop.at');
    }
  }

  if (!isObject(record.outcome)) {
    addError(errors, prefix, 'outcome must be an object');
    return;
  }

  const acceptedChange = record.outcome.accepted_change;
  if (acceptedChange !== null && !isNonEmptyString(acceptedChange)) {
    addError(errors, prefix, 'outcome.accepted_change must be a non-empty string or null');
  }

  if (isObject(record.evaluation) && record.evaluation.verdict === 'PASS' && !isNonEmptyString(acceptedChange)) {
    addError(errors, prefix, 'PASS requires outcome.accepted_change');
  }
  if (isObject(record.evaluation) && record.evaluation.verdict === 'PASS' && record.stop?.reason !== 'accepted') {
    addError(errors, prefix, 'PASS requires stop.reason accepted');
  }
  if (isNonEmptyString(acceptedChange) && (!isObject(record.evaluation) || record.evaluation.verdict !== 'PASS')) {
    addError(errors, prefix, 'outcome.accepted_change requires evaluation.verdict PASS');
  }
  if (
    isObject(record.stop) &&
    record.stop.reason === 'accepted' &&
    (!isObject(record.evaluation) || record.evaluation.verdict !== 'PASS')
  ) {
    addError(errors, prefix, 'stop.reason accepted requires evaluation.verdict PASS');
  }
}

function validateRecord(record, lineNumber) {
  const errors = [];
  if (!isObject(record)) {
    return [`line ${lineNumber}, run <unknown>: record must be a JSON object`];
  }

  const prefix = recordPrefix(lineNumber, record.run_id);
  validateIdentity(record, prefix, errors);
  validatePermissions(record, prefix, errors);
  validateBudgets(record, prefix, errors);
  const lastActionTimestamp = validateActions(record, prefix, errors);
  validateOutcome(record, prefix, errors, lastActionTimestamp);
  return errors;
}

export function parseAndValidateLedger(contents) {
  if (typeof contents !== 'string') {
    throw new LoopAccountabilityError(['ledger contents must be a string']);
  }

  const entries = [];
  const errors = [];

  for (const [index, rawLine] of contents.split(/\r?\n/).entries()) {
    if (rawLine.trim() === '') {
      continue;
    }

    const lineNumber = index + 1;
    try {
      entries.push({ lineNumber, record: JSON.parse(rawLine) });
    } catch (error) {
      errors.push(`line ${lineNumber}, run <unknown>: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  if (entries.length === 0 && errors.length === 0) {
    errors.push('ledger contains no run records');
  }

  const firstLineByRunId = new Map();
  const firstLineByAcceptedChange = new Map();
  for (const entry of entries) {
    errors.push(...validateRecord(entry.record, entry.lineNumber));

    if (!isObject(entry.record) || !isNonEmptyString(entry.record.run_id)) {
      continue;
    }

    if (firstLineByRunId.has(entry.record.run_id)) {
      errors.push(
        `${recordPrefix(entry.lineNumber, entry.record.run_id)}: duplicate run_id first declared on line ${firstLineByRunId.get(
          entry.record.run_id
        )}`
      );
    } else {
      firstLineByRunId.set(entry.record.run_id, entry.lineNumber);
    }

    const acceptedChange = entry.record.outcome?.accepted_change;
    if (!isNonEmptyString(acceptedChange)) {
      continue;
    }

    if (firstLineByAcceptedChange.has(acceptedChange)) {
      errors.push(
        `${recordPrefix(
          entry.lineNumber,
          entry.record.run_id
        )}: duplicate outcome.accepted_change "${acceptedChange}" first declared on line ${firstLineByAcceptedChange.get(acceptedChange)}`
      );
    } else {
      firstLineByAcceptedChange.set(acceptedChange, entry.lineNumber);
    }
  }

  if (errors.length > 0) {
    throw new LoopAccountabilityError(errors);
  }

  return entries.map((entry) => entry.record);
}

function roundMetric(value) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function summarizeRuns(runs) {
  if (!Array.isArray(runs)) {
    throw new TypeError('runs must be an array');
  }

  const acceptedChanges = new Set(
    runs
      .filter((run) => run?.evaluation?.verdict === 'PASS' && isNonEmptyString(run?.outcome?.accepted_change))
      .map((run) => run.outcome.accepted_change)
  ).size;
  const totalCost = runs.reduce((sum, run) => sum + (isNonNegativeNumber(run?.usage?.cost_usd) ? run.usage.cost_usd : 0), 0);

  return {
    attempts: runs.length,
    accepted_changes: acceptedChanges,
    acceptance_rate: runs.length === 0 ? 0 : roundMetric(acceptedChanges / runs.length),
    total_cost_usd: roundMetric(totalCost),
    cost_per_accepted_change_usd: acceptedChanges === 0 ? null : roundMetric(totalCost / acceptedChanges),
  };
}

function usage() {
  return [
    'Usage:',
    '  node scripts/loop-accountability.mjs validate <ledger.jsonl>',
    '  node scripts/loop-accountability.mjs summary <ledger.jsonl>',
  ].join('\n');
}

async function main() {
  const [, , command, ledgerPath] = process.argv;
  if (!['validate', 'summary'].includes(command) || !isNonEmptyString(ledgerPath)) {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }

  const contents = await readFile(ledgerPath, 'utf8');
  const runs = parseAndValidateLedger(contents);

  if (command === 'validate') {
    process.stdout.write(`Loop accountability OK: ${runs.length} attributable run record(s) passed.\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(summarizeRuns(runs), null, 2)}\n`);
}

const isDirectExecution = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectExecution) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Loop accountability validation failed:\n${message}\n`);
    process.exitCode = 1;
  });
}
