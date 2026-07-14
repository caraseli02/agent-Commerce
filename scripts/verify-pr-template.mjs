#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const requiredHeadings = ['Related lectures', 'Verification', 'Known risks', 'Evaluator rubric'];

const escapeHatchMarkers = [/<!--\s*skip-pr-template\s*-->/i, /\[x\]\s*skip pr template check/i, /\[x\]\s*hotfix bypass/i];

/**
 * @param {string} body
 * @param {string} heading
 */
export function extractSection(body, heading) {
  const pattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
  const match = pattern.exec(body);
  if (!match) {
    return '';
  }

  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextHeading = rest.search(/^##\s+/m);
  return (nextHeading === -1 ? rest : rest.slice(0, nextHeading)).trim();
}

/**
 * @param {string} body
 * @param {{ title?: string, labels?: string[] }} [options]
 */
export function hasEscapeHatch(body, { title = '', labels = [] } = {}) {
  if (process.env.SKIP_PR_TEMPLATE_CHECK === 'true') {
    return true;
  }

  if (/^hotfix:/i.test(title.trim())) {
    return true;
  }

  if (labels.some((label) => /^(hotfix|skip-pr-template)$/i.test(label))) {
    return true;
  }

  return escapeHatchMarkers.some((pattern) => pattern.test(body));
}

/**
 * @param {string} section
 */
export function isRelatedLecturesComplete(section) {
  const lectureLines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) && /lecture/i.test(line));

  return lectureLines.length >= 1;
}

/**
 * @param {string} section
 */
export function isVerificationComplete(section) {
  if (!section.trim()) {
    return false;
  }

  const hasCheckedOutcome = /\[x\][^\n]*(pass|fail|n\/a|not applicable|✅|❌|\d+\s+test)/i.test(section);
  const hasExplicitOutcome = /—\s*outcome:\s*\S/i.test(section) && !/—\s*outcome:\s*$/im.test(section);
  const hasPassFailWord = /\b(pass|fail|passed|failed)\b/i.test(section);

  return hasCheckedOutcome || hasExplicitOutcome || hasPassFailWord;
}

/**
 * @param {string} section
 */
export function isKnownRisksComplete(section) {
  if (!section.trim()) {
    return false;
  }

  if (/\[x\]/i.test(section)) {
    return true;
  }

  const freeText = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[-*]\s*\[[ x]\]/i.test(line));

  return freeText.some((line) => line.length >= 8);
}

/**
 * @param {string} section
 */
export function isEvaluatorRubricComplete(section) {
  const scoredLines = section.match(/^\s*[-*]?\s*[^:]+:\s*\d+\s*\/\s*\d+/gim) ?? [];
  return scoredLines.length >= 3;
}

/**
 * @param {string} body
 * @param {{ title?: string, labels?: string[] }} options
 */
export function inspectPrTemplate(body, options = {}) {
  const normalizedBody = body?.trim() ?? '';

  if (!normalizedBody) {
    return {
      ok: false,
      skipped: false,
      violations: ['PR body is empty. Fill out the ECAS PR template before opening the PR.'],
    };
  }

  if (hasEscapeHatch(normalizedBody, options)) {
    return { ok: true, skipped: true, violations: [] };
  }

  /** @type {string[]} */
  const violations = [];

  for (const heading of requiredHeadings) {
    if (!extractSection(normalizedBody, heading)) {
      violations.push(`Missing required section: ## ${heading}`);
    }
  }

  const relatedLectures = extractSection(normalizedBody, 'Related lectures');
  if (relatedLectures && !isRelatedLecturesComplete(relatedLectures)) {
    violations.push('Related lectures section must list at least one lecture bullet (for example "Lecture 09 — ...").');
  }

  const verification = extractSection(normalizedBody, 'Verification');
  if (verification && !isVerificationComplete(verification)) {
    violations.push('Verification section must include exact command outcomes (pass/fail/N/A), not unchecked template placeholders.');
  }

  const knownRisks = extractSection(normalizedBody, 'Known risks');
  if (knownRisks && !isKnownRisksComplete(knownRisks)) {
    violations.push('Known risks section must check at least one risk option or document an explicit risk note.');
  }

  const evaluatorRubric = extractSection(normalizedBody, 'Evaluator rubric');
  if (evaluatorRubric && !isEvaluatorRubricComplete(evaluatorRubric)) {
    violations.push('Evaluator rubric must include numeric scores for at least three dimensions (for example 2/2).');
  }

  return {
    ok: violations.length === 0,
    skipped: false,
    violations,
  };
}

async function readPrBodyFromGh(prNumber) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);

  const { stdout } = await execFileAsync('gh', ['pr', 'view', String(prNumber), '--json', 'body,title,labels'], {
    encoding: 'utf8',
  });

  const payload = JSON.parse(stdout);
  return {
    body: payload.body ?? '',
    title: payload.title ?? '',
    labels: Array.isArray(payload.labels) ? payload.labels.map((label) => label.name ?? label) : [],
  };
}

async function resolveInput() {
  const prFlagIndex = process.argv.indexOf('--pr');
  if (prFlagIndex !== -1) {
    const prNumber = process.argv[prFlagIndex + 1];
    if (!prNumber) {
      throw new Error('Missing value for --pr <number>');
    }

    return readPrBodyFromGh(prNumber);
  }

  const bodyFileIndex = process.argv.indexOf('--body-file');
  if (bodyFileIndex !== -1) {
    const bodyFile = process.argv[bodyFileIndex + 1];
    if (!bodyFile) {
      throw new Error('Missing value for --body-file <path>');
    }

    const { readFile } = await import('node:fs/promises');
    return { body: await readFile(bodyFile, 'utf8'), title: process.env.PR_TITLE ?? '', labels: [] };
  }

  if (process.env.PR_BODY) {
    const labels = process.env.PR_LABELS
      ? process.env.PR_LABELS.split(',')
          .map((label) => label.trim())
          .filter(Boolean)
      : [];

    return {
      body: process.env.PR_BODY,
      title: process.env.PR_TITLE ?? '',
      labels,
    };
  }

  return null;
}

async function main() {
  const input = await resolveInput();

  if (!input) {
    console.log('PR template check skipped: no PR body provided (set PR_BODY in CI or pass --pr/--body-file locally).');
    return;
  }

  const result = inspectPrTemplate(input.body, { title: input.title, labels: input.labels });

  if (result.skipped) {
    console.log('PR template check skipped via documented escape hatch.');
    return;
  }

  if (!result.ok) {
    console.error('PR template compliance failed: generator PRs must complete the ECAS template before review.');
    console.error('Why it matters: empty template sections hide verification evidence, risks, and evaluator rubric scores.');
    console.error(
      'Where to look next: fill `.github/pull_request_template.md` sections in the PR body, or use a documented escape hatch (`hotfix:` title prefix, `skip-pr-template` label, or `<!-- skip-pr-template -->` comment for human hotfixes).'
    );

    for (const violation of result.violations) {
      console.error(`- ${violation}`);
    }

    process.exit(1);
  }

  console.log('PR template compliance OK: required sections include lectures, verification outcomes, risks, and rubric scores.');
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
