#!/usr/bin/env node
// Runner for .github/workflows/auto-merge.yml (#603). Fetches PR state through
// the GitHub REST API, applies scripts/auto-merge-policy.mjs and merges with the
// head SHA pinned. It never checks out or runs PR code.
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  BASE_BRANCH,
  ENABLED_VARIABLE,
  EVALUATOR_CONTEXT,
  buildMergeCommit,
  decideMerge,
  parseAutoMergeCommit,
  planFromEvent,
} from './auto-merge-policy.mjs';

const API = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const CI_WORKFLOW_FILE = 'ci.yml';

export function createGitHubClient({ token, repository, fetchImpl = fetch }) {
  async function request(method, path, body) {
    const response = await fetchImpl(`${API}/repos/${repository}${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    return { status: response.status, ok: response.ok, data };
  }

  async function get(path) {
    const response = await request('GET', path);

    if (!response.ok) {
      throw new Error(`GET ${path} failed with ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return response.data;
  }

  async function paginate(path, pick = (data) => data, maxPages = 30) {
    const items = [];

    for (let page = 1; page <= maxPages; page += 1) {
      const separator = path.includes('?') ? '&' : '?';
      const batch = pick(await get(`${path}${separator}per_page=100&page=${page}`)) ?? [];

      items.push(...batch);

      if (batch.length < 100) break;
    }

    return items;
  }

  return { request, get, paginate };
}

async function readEnabledVariable(github) {
  const response = await github.request('GET', `/actions/variables/${ENABLED_VARIABLE}`);

  return response.ok ? response.data?.value : undefined;
}

async function prNumbersForSha(github, sha) {
  const pulls = await github.get(`/commits/${sha}/pulls`);

  return pulls.filter((pull) => pull.state === 'open').map((pull) => pull.number);
}

async function loadCiRuns(github, headSha) {
  const { workflow_runs: runs = [] } = await github.get(
    `/actions/workflows/${CI_WORKFLOW_FILE}/runs?head_sha=${headSha}&event=pull_request&per_page=20`,
  );

  return Promise.all(
    runs.map(async (run) => {
      const { jobs = [] } = await github.get(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100`);

      return { ...run, jobs };
    }),
  );
}

// GitHub computes `mergeable` lazily and returns null until it is ready.
async function loadPullRequest(github, prNumber, sleep) {
  let pr = await github.get(`/pulls/${prNumber}`);

  for (let attempt = 0; pr.mergeable === null && attempt < 3; attempt += 1) {
    await sleep(3000);
    pr = await github.get(`/pulls/${prNumber}`);
  }

  return pr;
}

export async function evaluatePullRequest(
  github,
  { prNumber, eventSha, evaluatorAppSlug, log = console.log, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) },
) {
  const pr = await loadPullRequest(github, prNumber, sleep);
  const headSha = pr.head?.sha;
  const [files, ciRuns, statuses, checkRuns, enabled] = await Promise.all([
    github.paginate(`/pulls/${prNumber}/files`),
    loadCiRuns(github, headSha),
    github.paginate(`/commits/${headSha}/statuses`, undefined, 3),
    // filter=all keeps queued/in-progress attempts that filter=latest can hide.
    github.paginate(
      `/commits/${headSha}/check-runs?check_name=${encodeURIComponent(EVALUATOR_CONTEXT)}&filter=all`,
      (data) => data?.check_runs,
      10,
    ),
    readEnabledVariable(github),
  ]);

  const decision = decideMerge({
    enabled,
    eventSha,
    pr,
    files,
    ciRuns,
    statuses,
    checkRuns,
    evaluatorAppSlug,
  });

  if (!decision.merge) {
    log(`PR #${prNumber} @ ${headSha}: not merging.\n  - ${decision.reasons.join('\n  - ')}`);
    return { merged: false, decision };
  }

  const response = await github.request('PUT', `/pulls/${prNumber}/merge`, {
    sha: decision.sha,
    merge_method: 'merge',
    ...buildMergeCommit(pr),
  });

  if (!response.ok) {
    // 405 (not mergeable) and 409 (head moved) are the expected safe failures.
    log(`PR #${prNumber} @ ${decision.sha}: merge refused (${response.status}): ${response.data?.message}`);
    return { merged: false, decision, status: response.status };
  }

  log(`PR #${prNumber} @ ${decision.sha}: merged as ${response.data?.sha}.`);
  return { merged: true, decision, mergeSha: response.data?.sha };
}

export async function pauseAfterFailedMain(github, { sha, runUrl, conclusion, serverUrl, repository, log = console.log }) {
  const commit = await github.get(`/commits/${sha}`);
  const autoMerge = parseAutoMergeCommit(commit?.commit?.message);

  if (!autoMerge) {
    log(`CI ${conclusion} on ${BASE_BRANCH} @ ${sha}, but that commit was not an auto-merge. Nothing to pause.`);
    return { paused: false };
  }

  const update = await github.request('PATCH', `/actions/variables/${ENABLED_VARIABLE}`, {
    name: ENABLED_VARIABLE,
    value: 'false',
  });

  const pause =
    update.status === 404 ? await github.request('POST', '/actions/variables', { name: ENABLED_VARIABLE, value: 'false' }) : update;

  if (!pause.ok) {
    throw new Error(
      `Could not set ${ENABLED_VARIABLE}=false after CI ${conclusion} on auto-merged ${sha} (${pause.status}): ` +
        `${JSON.stringify(pause.data)}. Auto-merge is NOT paused: set the repo variable by hand and check the ` +
        'Merger App has Variables: write.',
    );
  }

  const shortSha = sha.slice(0, 7);
  const prRef = autoMerge.prNumber ? `#${autoMerge.prNumber}` : 'an unknown PR';
  const title = `Auto-merge paused: CI failed on ${BASE_BRANCH} after auto-merge ${shortSha}`;
  const openIssues = await github.get('/issues?state=open&per_page=100');

  if (!openIssues.some((issue) => issue.title === title)) {
    const issue = await github.request('POST', '/issues', {
      title,
      body: [
        `CI concluded \`${conclusion}\` on \`${BASE_BRANCH}\` for an auto-merged commit, so \`${ENABLED_VARIABLE}\` was set to \`false\`.`,
        '',
        `- Merge commit: ${serverUrl}/${repository}/commit/${sha}`,
        `- Pull request: ${prRef}`,
        `- Failed run: ${runUrl}`,
        '',
        `Fix \`${BASE_BRANCH}\`, then set the repo variable \`${ENABLED_VARIABLE}\` back to \`true\` to resume auto-merge. See \`docs/agents/auto-merge.md\`.`,
      ].join('\n'),
    });

    if (!issue.ok) {
      throw new Error(
        `${ENABLED_VARIABLE} is now false, but opening the incident issue for ${sha} failed (${issue.status}): ` +
          `${JSON.stringify(issue.data)}. Open it by hand (commit, ${prRef}, ${runUrl}) and check the Merger App ` +
          'has Issues: write.',
      );
    }
  }

  log(`Paused auto-merge: ${ENABLED_VARIABLE}=false after CI ${conclusion} on ${sha} (${prRef}).`);
  return { paused: true, prNumber: autoMerge.prNumber };
}

async function main() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_NAME, GITHUB_EVENT_PATH } = process.env;

  if (!GITHUB_TOKEN) {
    console.log('Auto-merge: no Merger App token available; doing nothing.');
    return;
  }

  const payload = JSON.parse(await readFile(GITHUB_EVENT_PATH, 'utf8'));
  const plan = planFromEvent(GITHUB_EVENT_NAME, payload, { prNumber: process.env.INPUT_PR_NUMBER });
  const github = createGitHubClient({ token: GITHUB_TOKEN, repository: GITHUB_REPOSITORY });

  if (plan.kind === 'skip') {
    console.log(`Auto-merge: skipping (${plan.reason}).`);
    return;
  }

  if (plan.kind === 'pause-check') {
    await pauseAfterFailedMain(github, {
      ...plan,
      serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
      repository: GITHUB_REPOSITORY,
    });
    return;
  }

  const prNumbers = plan.prNumbers.length > 0 ? plan.prNumbers : await prNumbersForSha(github, plan.sha);

  if (prNumbers.length === 0) {
    console.log(`Auto-merge: no open PR found for ${plan.sha}.`);
    return;
  }

  for (const prNumber of new Set(prNumbers)) {
    await evaluatePullRequest(github, {
      prNumber,
      eventSha: plan.sha,
      evaluatorAppSlug: process.env.EVALUATOR_APP_SLUG,
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
