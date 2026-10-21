#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { evidenceRef, uiDiff } from './ui-evidence.mjs';

// First pushes may precede PR creation. Existing PRs must validate their live body;
// creating/editing a body still requires --body-file before publication.
export function checkPushTemplates(
  input,
  {
    run = (args) => execFileSync('gh', args, { encoding: 'utf8', timeout: 30_000 }),
    uiFingerprint = (sha) => uiDiff({ head: sha }).fingerprint,
  } = {},
) {
  const branches = new Map();
  for (const line of input.trim().split('\n').filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4) throw new Error('Invalid pre-push ref input.');
    const [, sha, ref] = fields;
    if (/^0+$/.test(sha) || ref === evidenceRef) continue;
    if (ref.startsWith('refs/heads/')) branches.set(ref.slice('refs/heads/'.length), sha);
  }
  for (const [branch, sha] of branches) {
    const prs = JSON.parse(run(['pr', 'list', '--head', branch, '--state', 'open', '--limit', '100', '--json', 'number,body,labels']));
    if (!Array.isArray(prs) || prs.length >= 100) throw new Error('Incomplete PR metadata lookup.');
    if (!prs.length) process.stdout.write(`No open PR for ${branch}; validate --body-file before creating the PR.\n`);
    for (const pr of prs) {
      const ui = { fingerprint: uiFingerprint(sha) };
      const result = assessPrTemplate({ body: pr.body, labels: pr.labels.map((label) => label.name), ui });
      if (result.status === 'failed') throw new Error(`PR #${pr.number}: ${result.violations.join(' ')}`);
    }
  }
}

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

// UI PRs show before/after images (scripts/pr-screenshots.mjs) bound to their current UI diff,
// or say why nothing visible changed.
function validateScreenshots(sections, fingerprint) {
  if (!fingerprint) return [];
  const howTo = 'run `pnpm pr:screenshots --routes <affected routes>` and paste its section, or write "No visible change: <reason>"';
  if (!sections.has('Screenshots')) return [`UI files changed but the ## Screenshots section is missing; ${howTo}.`];
  const section = sectionText(sections, 'Screenshots');
  if (/^No visible change:\s*\S.{9,}/im.test(section)) return [];
  const marker = section.match(/<!-- pr-screenshots: ui=([0-9a-f]{64}) -->/);
  if (!marker) return [`## Screenshots has no pr-screenshots marker; ${howTo}.`];
  if (marker[1] !== fingerprint) return [`## Screenshots is stale: the PR's UI diff changed since they were captured; ${howTo}.`];
  const images = section.match(/<img\s[^>]*src="https:\/\/github\.com\/[^"]+\.(?:png|jpg)\?raw=true"/g) ?? [];
  if (images.length < 2) return ['## Screenshots needs at least one before/after image pair.'];
  return [];
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

export function assessPrTemplate({ body, labels = [], ui } = {}) {
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
      'PR body is empty. Add the Components Marketplace PR template sections or apply the skip-pr-template-check label for an approved human hotfix.',
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

  violations.push(...validateScreenshots(sections, ui?.fingerprint));

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

async function fetchCurrentPullRequest({ repository, number, token }) {
  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${number}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load current PR metadata from GitHub (HTTP ${response.status}).`);
  }

  return response.json();
}

export async function resolvePullRequestContext(event, fetchCurrentPullRequest) {
  if (!event?.pull_request) {
    return null;
  }

  if (!fetchCurrentPullRequest) {
    return event.pull_request;
  }

  return fetchCurrentPullRequest(event.pull_request.number);
}

function bodyFileArgument(argv) {
  const index = argv.findIndex((arg) => arg === '--body-file' || arg.startsWith('--body-file='));
  if (index === -1) return null;
  const value = argv[index].includes('=') ? argv[index].slice(argv[index].indexOf('=') + 1) : argv[index + 1];
  if (!value) throw new Error('--body-file needs a path.');
  return value;
}

function report(result) {
  if (result.status === 'skipped' || result.status === 'passed') {
    process.stdout.write(`${result.reason}\n`);
    return;
  }

  console.error(result.reason);
  for (const violation of result.violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

async function main() {
  // Local preflight: check a PR body file before `gh pr create` / `gh pr edit` sends it.
  const bodyFile = bodyFileArgument(process.argv.slice(2));
  if (bodyFile) {
    // The body describes the checked-out head; a checkout without main's merge base cannot tell.
    let ui;
    try {
      ui = uiDiff();
    } catch (error) {
      process.stderr.write(`Screenshot check skipped: ${error.message.split('\n')[0]}\n`);
    }
    report(assessPrTemplate({ body: await readFile(bodyFile, 'utf8'), ui }));
    return;
  }

  const event = await loadGitHubEvent();

  if (!event?.pull_request) {
    console.log('No pull-request CI context detected; skipping PR template check.');
    return;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const loadCurrentPullRequest = repository && token ? (number) => fetchCurrentPullRequest({ repository, number, token }) : null;
  const pullRequest = await resolvePullRequestContext(event, loadCurrentPullRequest);
  const labels = (pullRequest.labels ?? []).map((label) => label?.name).filter(Boolean);
  report(assessPrTemplate({ body: pullRequest.body, labels }));
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
