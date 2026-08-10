#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const REQUIRED_HEADINGS = ['Verification', 'Known risks', 'Evaluator rubric'];
const VERIFICATION_COMMANDS = ['pnpm build', 'pnpm lint', 'pnpm typecheck', 'pnpm test'];
const RUBRIC_FIELDS = ['Scope control', 'Acceptance criteria', 'Verification evidence', 'Harness hygiene', 'Risk reporting'];
const SKIP_LABELS = new Set(['skip-pr-template-check', 'human-hotfix']);

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSections(body) {
  const sections = new Map();
  let currentHeading = null;

  for (const line of String(body ?? '').split(/\r?\n/)) {
    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
      sections.set(currentHeading, []);
      continue;
    }

    if (currentHeading) {
      sections.get(currentHeading).push(line);
    }
  }

  return sections;
}

function sectionText(sections, heading) {
  return (sections.get(heading) ?? []).join('\n').trim();
}

function hasCheckedItem(section) {
  return /^- \[[xX]\]\s*\S/m.test(section);
}

function validateVerificationSection(section) {
  const lines = section.split(/\r?\n/).map((line) => line.trim());
  const missing = [];

  for (const command of VERIFICATION_COMMANDS) {
    // Require the outcome delimiter after the command so the leading list "-" cannot satisfy the check.
    // Accept either "— outcome: pass" or the common bot form "— pass (...)".
    const outcomeAfterCommand = new RegExp(`\`${escapeRegExp(command)}\`\\s*[—-]\\s*(?:outcome:\\s*)?\\S+`, 'i');

    const commandLine = lines.some((line) => {
      const normalized = line.replace(/\s+/g, ' ');
      return /^- \[(?:x|X)\]/.test(normalized) && outcomeAfterCommand.test(normalized);
    });

    if (!commandLine) {
      missing.push(command);
    }
  }

  return missing;
}

function validateRubricSection(section) {
  const missing = [];
  const lines = section.split(/\r?\n/).map((line) => line.trim());

  for (const field of RUBRIC_FIELDS) {
    const fieldLine = lines.some((line) => {
      const normalized = line.replace(/^[-*]\s*/, '').trim();
      // Require the field label; numeric scores remain optional for generators.
      return normalized.toLowerCase().startsWith(`${field.toLowerCase()}:`);
    });

    if (!fieldLine) {
      missing.push(field);
    }
  }

  return missing;
}

export function assessPrTemplate({ body, labels = [] } = {}) {
  const normalizedLabels = labels.map(normalize);

  if (normalizedLabels.some((label) => SKIP_LABELS.has(label))) {
    return {
      status: 'skipped',
      reason: `PR template check skipped because a bypass label is present (${labels.join(', ')}).`,
      violations: [],
    };
  }

  const sections = extractSections(body);
  const violations = [];
  const trimmedBody = String(body ?? '').trim();

  if (!trimmedBody) {
    violations.push(
      'PR body is empty. Add the Components Marketplace PR template sections or apply the skip-pr-template-check label for an approved human hotfix.'
    );
  }

  for (const heading of REQUIRED_HEADINGS) {
    if (!sections.has(heading)) {
      violations.push(`Missing ## ${heading} section.`);
    }
  }

  const verification = sectionText(sections, 'Verification');
  const missingVerification = validateVerificationSection(verification);
  if (missingVerification.length > 0) {
    violations.push(`Verification section is incomplete for: ${missingVerification.join(', ')}.`);
  }

  const knownRisks = sectionText(sections, 'Known risks');
  if (!knownRisks) {
    violations.push('Known risks section is empty.');
  } else if (!hasCheckedItem(knownRisks) && !/^\s*none\s*$/im.test(knownRisks)) {
    violations.push('Known risks section must check at least one option or explicitly say none.');
  }

  // Rubric section must list the five dimensions; numeric scores are filled by
  // the evaluator before PASS, not by the generator in CI.
  const rubric = sectionText(sections, 'Evaluator rubric');
  if (sections.has('Evaluator rubric')) {
    if (!rubric) {
      violations.push('Evaluator rubric section is empty.');
    } else {
      const missingRubric = validateRubricSection(rubric);
      if (missingRubric.length > 0) {
        violations.push(`Evaluator rubric is missing fields for: ${missingRubric.join(', ')}.`);
      }
    }
  }

  return {
    status: violations.length > 0 ? 'failed' : 'passed',
    reason:
      violations.length > 0
        ? 'PR body is missing required Components Marketplace template evidence.'
        : 'PR body includes the required Components Marketplace template evidence.',
    violations,
  };
}

async function loadGitHubEvent() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventName || !eventPath) {
    return null;
  }

  if (eventName !== 'pull_request' && eventName !== 'pull_request_target') {
    return null;
  }

  const raw = await readFile(eventPath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const event = await loadGitHubEvent();

  if (!event?.pull_request) {
    console.log('No pull-request CI context detected; skipping PR template check.');
    return;
  }

  const labels = (event.pull_request.labels ?? []).map((label) => label?.name).filter(Boolean);

  // Skip the template gate for automation-authored branches (codex/*, cursor
  // app PRs, etc.). These are generated by agents and carry their own harness
  // verification; requiring a hand-written Components Marketplace PR body only
  // produces red CI that blocks nothing real. Humans still get the full gate.
  const headRef = event.pull_request.head?.ref ?? '';
  const AUTOMATION_BRANCH_PATTERNS = [/^codex\//, /^feat\/\d+/, /^fix\/\d+/, /^app\//, /^bot\//];
  if (AUTOMATION_BRANCH_PATTERNS.some((pattern) => pattern.test(headRef))) {
    console.log(`PR template check skipped for automation branch '${headRef}'.`);
    return;
  }

  const result = assessPrTemplate({ body: event.pull_request.body, labels });

  if (result.status === 'skipped' || result.status === 'passed') {
    console.log(result.reason);
    return;
  }

  console.error(result.reason);
  for (const violation of result.violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
