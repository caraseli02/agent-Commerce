#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const REQUIRED_HEADINGS = ['Verification', 'Known risks', 'Evaluator rubric'];
const VERIFICATION_COMMANDS = ['pnpm build', 'pnpm lint', 'pnpm typecheck', 'pnpm test'];
const SKIP_LABELS = new Set(['skip-pr-template-check', 'human-hotfix']);

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
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
    const commandLine = lines.some((line) => {
      const normalized = line.replace(/\s+/g, ' ');
      return (
        /^- \[(?:x|X)\]/.test(normalized) &&
        normalized.includes(`\`${command}\``) &&
        // Accept either "— outcome: pass" or the common bot form "— pass (...)"
        /[—-]\s*(?:outcome:\s*)?\S/i.test(normalized)
      );
    });

    if (!commandLine) {
      missing.push(command);
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
      'PR body is empty. Add the ECAS PR template sections or apply the skip-pr-template-check label for an approved human hotfix.'
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

  // Rubric section must exist so the evaluator has a place to score; numeric
  // scores are filled by the evaluator before PASS, not by the generator in CI.
  const rubric = sectionText(sections, 'Evaluator rubric');
  if (sections.has('Evaluator rubric') && !rubric) {
    violations.push('Evaluator rubric section is empty.');
  }

  return {
    status: violations.length > 0 ? 'failed' : 'passed',
    reason:
      violations.length > 0
        ? 'PR body is missing required ECAS template evidence.'
        : 'PR body includes the required ECAS template evidence.',
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
