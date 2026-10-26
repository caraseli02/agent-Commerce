#!/usr/bin/env node
// Sync caraseli02/agent-Commerce issues and PRs into a GitHub Project board
// whose Status column says who has to act next.
//
//   node scripts/project-sync.mjs            dry run: print what each item would get
//   node scripts/project-sync.mjs --apply    create/update the project, fields, views and items
//
// Labels, PRs and evaluator comments stay the source of truth; the board is a
// derived view and every run recomputes it. Needs gh with the `project` scope.

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO = 'caraseli02/agent-Commerce';
const [OWNER, NAME] = REPO.split('/');
const TITLE = 'agent-Commerce control';
const SKIP_TITLES = new Set(['Claude morning digest']);

export const STATUS = [
  { name: 'Needs you: merge', color: 'GREEN', description: 'Evaluator PASS on the current head; only Vlad merges' },
  { name: 'Needs you: unblock', color: 'RED', description: 'Labeled blocked; the Next action is the Best next move' },
  { name: 'Needs you: triage', color: 'ORANGE', description: 'needs-triage / needs-info, or an inbox waiting for your tick' },
  { name: 'Needs you: do or hand off', color: 'PINK', description: 'ready-for-human without a PR: do it, or hand it to an agent' },
  { name: 'In review', color: 'YELLOW', description: 'Open PR waiting for the opposite builder or a repair' },
  { name: 'Agents building', color: 'BLUE', description: 'Claimed (in-progress), no PR yet' },
  { name: 'Agent queue', color: 'PURPLE', description: 'Buildable by an agent when its turn comes' },
  { name: 'Backlog', color: 'GRAY', description: 'Epics and everything not yet routed' },
  { name: 'Done', color: 'GRAY', description: 'Closed or merged' },
];
const LANES = [
  { name: 'Vlad', color: 'RED', description: '' },
  { name: 'Claude', color: 'ORANGE', description: '' },
  { name: 'Codex', color: 'BLUE', description: '' },
  { name: '—', color: 'GRAY', description: '' },
];
const PRIORITIES = [
  { name: 'P0', color: 'RED', description: '' },
  { name: 'P1', color: 'ORANGE', description: '' },
  { name: 'P2', color: 'YELLOW', description: '' },
  { name: 'P3', color: 'GRAY', description: '' },
];
const VIEWS = [
  {
    name: 'Needs me',
    layout: 'TABLE_LAYOUT',
    filter: 'status:"Needs you: merge","Needs you: unblock","Needs you: triage","Needs you: do or hand off"',
  },
  { name: 'Board', layout: 'BOARD_LAYOUT', filter: '-status:Done' },
  { name: 'By lane', layout: 'TABLE_LAYOUT', filter: '-status:Done' },
];

const gh = (args, input) =>
  execFileSync('gh', args, { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'inherit'] });
const ghJson = (args) => JSON.parse(gh(args));
const graphql = (query, variables = {}) => {
  const res = JSON.parse(gh(['api', 'graphql', '--input', '-'], JSON.stringify({ query, variables })));
  if (res.errors) throw new Error(JSON.stringify(res.errors));
  return res.data;
};

const labelsOf = (item) => new Set(item.labels.map((l) => l.name));
const comments = (n) =>
  gh(['api', `repos/${REPO}/issues/${n}/comments`, '--paginate', '--jq', '.[] | {body, created_at}'])
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

// Newest final evaluator verdict for the current head, if any (same markers as the routine).
export function verdictFromComments(list, head) {
  const reports = list.filter((c) => {
    const body = c.body.trimStart();
    return (
      (body.startsWith(`<!-- evaluator-head: ${head} -->`) || body.startsWith(`<!-- local-evaluator sha=${head} -->`)) &&
      c.body.includes('## Evaluator verdict')
    );
  });
  const last = reports.at(-1);
  return last ? (last.body.match(/\b(PASS|FAIL|BLOCKED)\b/)?.[1] ?? null) : null;
}

// The "Best next move" line of the newest blocker comment.
export function bestNextMoveFromComments(list) {
  const blocked = list.filter((c) => /Best next move/i.test(c.body)).at(-1);
  const line = blocked?.body.split('\n').find((l) => /Best next move/i.test(l));
  return line ? line.replace(/^[\s*#>-]*\**Best next move:?\**:?\s*/i, '').slice(0, 240) : null;
}

const githubLookups = {
  verdict: (pr) => verdictFromComments(comments(pr.number), pr.headRefOid),
  bestNextMove: (n) => bestNextMoveFromComments(comments(n)),
};

const builderOf = (labels, branch = '') =>
  labels.has('agent:claude') || labels.has('agent:claude-self') || branch.startsWith('claude/')
    ? 'Claude'
    : branch.startsWith('codex/')
      ? 'Codex'
      : null;

const priorityOf = (labels) => ['p0', 'p1', 'p2', 'p3'].find((p) => labels.has(`priority:${p}`))?.toUpperCase() ?? null;

export function classifyPr(pr, labels, lookups = githubLookups) {
  const builder = builderOf(labels, pr.headRefName) ?? 'Codex';
  const reviewer = builder === 'Claude' ? 'Codex' : 'Claude';
  if (pr.isDraft) return { status: 'Agents building', lane: builder, next: `Draft PR #${pr.number}` };
  const verdict = lookups.verdict(pr);
  if (verdict === 'PASS')
    return { status: 'Needs you: merge', lane: 'Vlad', next: `Merge PR #${pr.number} (PASS on ${pr.headRefOid.slice(0, 7)})` };
  if (verdict === 'BLOCKED')
    return { status: 'Needs you: unblock', lane: 'Vlad', next: `PR #${pr.number}: evaluator BLOCKED, needs your decision` };
  if (verdict === 'FAIL') return { status: 'In review', lane: builder, next: `PR #${pr.number}: ${builder} repairing after FAIL` };
  return { status: 'In review', lane: reviewer, next: `PR #${pr.number}: waiting for ${reviewer} review` };
}

export function classifyIssue(issue, pr, lookups = githubLookups) {
  const labels = labelsOf(issue);
  const builder = builderOf(labels, pr?.headRefName);
  if (labels.has('blocked'))
    return {
      status: 'Needs you: unblock',
      lane: 'Vlad',
      next: lookups.bestNextMove(issue.number) ?? 'Read the Blocked comment, then remove `blocked`',
    };
  if (pr) return classifyPr(pr, new Set([...labels, ...labelsOf(pr)]), lookups);
  if (labels.has('needs-triage') || labels.has('needs-info'))
    return {
      status: 'Needs you: triage',
      lane: 'Vlad',
      next: labels.has('needs-info') ? 'Answer the open question' : 'Triage: label agent:claude or ready-for-agent, or close',
    };
  if (/^Learnings inbox/.test(issue.title))
    return { status: 'Needs you: triage', lane: 'Vlad', next: 'Tick entries, then label agent:claude to publish' };
  if (labels.has('epic')) return { status: 'Backlog', lane: '—', next: 'Tracking epic' };
  if (labels.has('ready-for-human'))
    return {
      status: 'Needs you: do or hand off',
      lane: 'Vlad',
      next:
        builder === 'Claude'
          ? 'Remove ready-for-human so Claude builds it, or do it yourself'
          : 'Do it yourself, or swap ready-for-human → ready-for-agent for Codex',
    };
  if (labels.has('in-progress')) return { status: 'Agents building', lane: builder ?? 'Codex', next: 'Claimed, no PR yet' };
  if (labels.has('ready-for-agent') || builder)
    return { status: 'Agent queue', lane: builder ?? 'Codex', next: `Next for ${builder ?? 'Codex'}` };
  return { status: 'Backlog', lane: '—', next: 'Not routed yet' };
}

function desiredItems() {
  const issues = ghJson([
    'issue',
    'list',
    '--repo',
    REPO,
    '--state',
    'open',
    '--limit',
    '500',
    '--json',
    'id,number,title,labels,url',
  ]).filter((i) => !SKIP_TITLES.has(i.title));
  const prs = ghJson([
    'pr',
    'list',
    '--repo',
    REPO,
    '--state',
    'open',
    '--limit',
    '200',
    '--json',
    'id,number,title,labels,url,headRefName,headRefOid,isDraft,closingIssuesReferences',
  ]);
  const prForIssue = new Map();
  for (const pr of prs) {
    const linked = pr.closingIssuesReferences.map((r) => r.number);
    const fromBranch = pr.headRefName.match(/^(?:claude\/issue-|codex\/)(\d+)/)?.[1];
    for (const n of fromBranch ? [...linked, Number(fromBranch)] : linked) prForIssue.set(n, pr);
  }
  const items = issues.map((issue) => ({
    contentId: issue.id,
    ref: `#${issue.number}`,
    title: issue.title,
    priority: priorityOf(labelsOf(issue)),
    ...classifyIssue(issue, prForIssue.get(issue.number)),
  }));
  // PRs with no open issue of their own (harness PRs, for example) get their own row.
  const openIssueNumbers = new Set(issues.map((i) => i.number));
  for (const pr of prs) {
    if ([...prForIssue].some(([n, p]) => p === pr && openIssueNumbers.has(n))) continue;
    items.push({
      contentId: pr.id,
      ref: `PR #${pr.number}`,
      title: pr.title,
      priority: priorityOf(labelsOf(pr)),
      ...classifyPr(pr, labelsOf(pr)),
    });
  }
  return items;
}

// ---------- project plumbing ----------

const PROJECT_FIELDS = `fields(first: 50) { nodes {
  ... on ProjectV2FieldCommon { id name dataType }
  ... on ProjectV2SingleSelectField { options { id name } } } }`;

function findProject() {
  const data = graphql(
    `
      query ($login: String!) {
        user(login: $login) {
          id
          projectsV2(first: 50) {
            nodes {
              id
              number
              title
              url
            }
          }
        }
      }
    `,
    { login: OWNER },
  );
  return { ownerId: data.user.id, project: data.user.projectsV2.nodes.find((p) => p.title === TITLE) };
}

function loadProject(id) {
  return graphql(
    `query($id: ID!) { node(id: $id) { ... on ProjectV2 { id number url ${PROJECT_FIELDS} views(first: 20) { nodes { id name } } } } }`,
    { id },
  ).node;
}

function ensureProject() {
  let { ownerId, project } = findProject();
  if (!project) {
    const repoId = graphql(`query { repository(owner: "${OWNER}", name: "${NAME}") { id } }`).repository.id;
    project = graphql(
      `
        mutation ($ownerId: ID!, $title: String!, $repo: ID!) {
          createProjectV2(input: { ownerId: $ownerId, title: $title, repositoryId: $repo }) {
            projectV2 {
              id
            }
          }
        }
      `,
      { ownerId, title: TITLE, repo: repoId },
    ).createProjectV2.projectV2;
    graphql(
      `
        mutation ($id: ID!) {
          updateProjectV2(
            input: {
              projectId: $id
              shortDescription: "Who acts next on agent-Commerce. Derived from labels, PRs and evaluator verdicts by project-sync.mjs; do not drag cards, change labels instead."
            }
          ) {
            projectV2 {
              id
            }
          }
        }
      `,
      { id: project.id },
    );
    console.log('created project');
  }
  return loadProject(project.id);
}

function ensureSelectField(project, name, options) {
  const existing = project.fields.nodes.find((f) => f.name === name);
  if (!existing) {
    graphql(
      `
        mutation ($p: ID!, $name: String!, $opts: [ProjectV2SingleSelectFieldOptionInput!]!) {
          createProjectV2Field(input: { projectId: $p, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $opts }) {
            projectV2Field {
              ... on ProjectV2FieldCommon {
                id
              }
            }
          }
        }
      `,
      { p: project.id, name, opts: options },
    );
    return;
  }
  const have = existing.options.map((o) => o.name).join('|');
  if (have === options.map((o) => o.name).join('|')) return;
  // Keep the ids of options that survive so items already set keep their value.
  const opts = options.map((o) => ({
    ...o,
    ...(existing.options.find((e) => e.name === o.name) ? { id: existing.options.find((e) => e.name === o.name).id } : {}),
  }));
  graphql(
    `
      mutation ($f: ID!, $opts: [ProjectV2SingleSelectFieldOptionInput!]!) {
        updateProjectV2Field(input: { fieldId: $f, singleSelectOptions: $opts }) {
          projectV2Field {
            ... on ProjectV2FieldCommon {
              id
            }
          }
        }
      }
    `,
    { f: existing.id, opts },
  );
}

function ensureTextField(project, name) {
  if (project.fields.nodes.some((f) => f.name === name)) return;
  graphql(
    `
      mutation ($p: ID!, $name: String!) {
        createProjectV2Field(input: { projectId: $p, dataType: TEXT, name: $name }) {
          projectV2Field {
            ... on ProjectV2FieldCommon {
              id
            }
          }
        }
      }
    `,
    {
      p: project.id,
      name,
    },
  );
}

function ensureViews(project) {
  const field = (n) => project.fields.nodes.find((f) => f.name === n)?.id;
  const visible = ['Title', 'Status', 'Next action', 'Lane', 'Priority'].map(field).filter(Boolean);
  for (const view of VIEWS) {
    let id = project.views.nodes.find((v) => v.name === view.name)?.id;
    if (!id) {
      id = graphql(
        `
          mutation ($p: ID!, $name: String!, $layout: ProjectV2ViewLayout!, $fields: [ID!]!) {
            createProjectV2View(input: { projectId: $p, name: $name, layout: $layout, configuration: { visibleFieldIds: $fields } }) {
              projectV2View {
                id
              }
            }
          }
        `,
        { p: project.id, name: view.name, layout: view.layout, fields: visible },
      ).createProjectV2View.projectV2View.id;
      console.log(`created view ${view.name}`);
    }
    graphql(
      `
        mutation ($v: ID!, $filter: String!) {
          updateProjectV2View(input: { viewId: $v, filter: $filter }) {
            projectV2View {
              id
            }
          }
        }
      `,
      { v: id, filter: view.filter },
    );
  }
}

function projectItems(projectId) {
  const items = [];
  let after = null;
  do {
    const page = graphql(
      `
        query ($id: ID!, $after: String) {
          node(id: $id) {
            ... on ProjectV2 {
              items(first: 100, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  content {
                    ... on Issue {
                      id
                      state
                    }
                    ... on PullRequest {
                      id
                      state
                    }
                  }
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      { id: projectId, after },
    ).node.items;
    items.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return items.map((it) => ({
    id: it.id,
    contentId: it.content?.id,
    state: it.content?.state,
    values: Object.fromEntries(it.fieldValues.nodes.filter((v) => v.field).map((v) => [v.field.name, v.name ?? v.text])),
  }));
}

function setValue(project, itemId, fieldName, value) {
  const field = project.fields.nodes.find((f) => f.name === fieldName);
  if (value == null) {
    graphql(
      `
        mutation ($p: ID!, $i: ID!, $f: ID!) {
          clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) {
            projectV2Item {
              id
            }
          }
        }
      `,
      { p: project.id, i: itemId, f: field.id },
    );
    return;
  }
  const v = field.options ? { singleSelectOptionId: field.options.find((o) => o.name === value).id } : { text: value };
  graphql(
    `
      mutation ($p: ID!, $i: ID!, $f: ID!, $v: ProjectV2FieldValue!) {
        updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: $v }) {
          projectV2Item {
            id
          }
        }
      }
    `,
    {
      p: project.id,
      i: itemId,
      f: field.id,
      v,
    },
  );
}

// ---------- main ----------

function main(apply) {
  const items = desiredItems();
  const counts = Object.fromEntries(STATUS.map((s) => [s.name, 0]));
  for (const it of items) counts[it.status]++;

  if (!apply) {
    for (const s of STATUS.filter((s) => s.name !== 'Done')) {
      const rows = items.filter((i) => i.status === s.name);
      if (!rows.length) continue;
      console.log(`\n${s.name} (${rows.length})`);
      for (const r of rows)
        console.log(
          `  ${r.ref.padEnd(8)} [${r.lane}${r.priority ? ' ' + r.priority : ''}] ${r.title.slice(0, 70)}\n           → ${r.next}`,
        );
    }
    console.log('\nDry run. Pass --apply to write the project.');
    return;
  }

  let project = ensureProject();
  ensureSelectField(project, 'Status', STATUS);
  ensureSelectField(project, 'Lane', LANES);
  ensureSelectField(project, 'Priority', PRIORITIES);
  ensureTextField(project, 'Next action');
  project = loadProject(project.id);
  ensureViews(project);

  const current = new Map(projectItems(project.id).map((it) => [it.contentId, it]));
  let changed = 0;
  const wanted = new Set();
  for (const it of items) {
    wanted.add(it.contentId);
    let row = current.get(it.contentId);
    if (!row) {
      const id = graphql(
        `
          mutation ($p: ID!, $c: ID!) {
            addProjectV2ItemById(input: { projectId: $p, contentId: $c }) {
              item {
                id
              }
            }
          }
        `,
        { p: project.id, c: it.contentId },
      ).addProjectV2ItemById.item.id;
      row = { id, values: {} };
    }
    for (const [field, value] of [
      ['Status', it.status],
      ['Lane', it.lane],
      ['Priority', it.priority],
      ['Next action', it.next],
    ]) {
      if ((row.values[field] ?? null) === value) continue;
      setValue(project, row.id, field, value);
      changed++;
    }
  }
  // Rows whose issue or PR closed since the last run move to Done.
  for (const row of current.values()) {
    if (wanted.has(row.contentId) || row.values.Status === 'Done') continue;
    if (row.state === 'OPEN') continue; // e.g. the digest, or an item added by hand
    setValue(project, row.id, 'Status', 'Done');
    setValue(project, row.id, 'Next action', null);
    changed++;
  }

  const attention = STATUS.filter((s) => s.name.startsWith('Needs you')).reduce((n, s) => n + counts[s.name], 0);
  console.log(`project-sync: ${items.length} open items, ${attention} need Vlad, ${changed} field updates → ${project.url}`);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.includes('--apply'));
}
