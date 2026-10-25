"""Pure Codex routing policy. Live evidence decides readiness; history preserves identity."""
import hashlib
import json
import re


class UnsafeEvidence(ValueError):
    pass


def validate_config(config):
    if config.get('version') != 1 or not config.get('builder_login') or config.get('max_pass_queue') != 2 or not 30 <= config.get('investigation_minutes', 0) <= 45 or not 0 < config.get('max_findings_per_run', 0) <= 3 or not 0 < config.get('max_open_findings', 0) <= 5 or config.get('verification_provider') != 'husky-local-review' or not config.get('trusted_evaluator_logins'):
        raise UnsafeEvidence('Invalid routing caps/trust/config version; review configuration before dispatch')


def labels(item):
    return {x if isinstance(x, str) else x['name'] for x in item.get('labels', [])}


def closing_numbers(body):
    return {int(n) for n in re.findall(r'\b(?:closes?|closed|fixes|fixed|resolves?|resolved)\s*:?\s+#(\d+)', body or '', re.I)}


def owner(issue, prs):
    signals = set()
    if 'agent:claude' in labels(issue):
        signals.add('claude')
    for comment in issue.get('comments', []):
        # Only repository-owner claim records establish legacy ownership.
        if comment.get('author_association') != 'OWNER':
            continue
        match = re.search(r'\bClaimed by (Claude|Codex)\b', comment.get('body', ''), re.I)
        if match:
            signals.add(match[1].lower())
        sprint = re.search(r'^## Sprint contract[^\n]*\b(Claude|Codex)\b', comment.get('body', ''), re.M | re.I)
        if sprint:
            signals.add(sprint[1].lower())
    for pr in prs:
        ref = pr['head']['ref']
        if ref.startswith('claude/') or 'agent:claude' in labels(pr) or 'Generated with [Claude Code]' in (pr.get('body') or '') or pr.get('claude_coauthor'):
            signals.add('claude')
        if ref.startswith('codex/'):
            signals.add('codex')
    if len(signals) > 1:
        raise UnsafeEvidence('Contradictory builder ownership')
    if not signals and 'in-progress' in labels(issue):
        raise UnsafeEvidence('Claimed issue lacks accountable builder ownership')
    return next(iter(signals), 'codex')


def attests_local_verification(body, head):
    """The report's own audit line for this head; any base tip and metadata digest are accepted."""
    if not re.fullmatch(r'[0-9a-f]{7,64}', head or ''):
        return False
    line = re.compile(rf'<!-- local-verification: head={head} base=[0-9a-f]{{40}} metadata=[0-9a-f]{{64}} -->', re.I)
    return any(line.fullmatch(entry) for entry in (body or '').splitlines())


def evaluator(comments, head, trusted):
    """Verdict for the exact head; base, body and label changes never reopen it.

    Same rule as scripts/owner-attention.mjs latestEvaluatorVerdict: reports with the head's
    local-verification line supersede legacy unmarked ones, contradictory reports for one
    head fail closed, and a re-review request for the head posted after a FAIL or BLOCKED
    without a PASS starts a new round.
    """
    request = f'<!-- external-review-request: {head} -->'

    def counted(reports):
        return [r for r in reports if r[1]] if any(r[1] for r in reports) else reports

    round_ = []
    for c in comments:
        body = c.get('body', '').lstrip()
        login = c.get('user', {}).get('login', '').lower()
        if login not in {x.lower() for x in trusted} or login.endswith('[bot]'):
            continue
        if body.lower().startswith(request):
            if round_ and all(r[0] != 'PASS' for r in counted(round_)):
                round_ = []
            continue
        markers = (f'<!-- evaluator-head: {head} -->', f'<!-- local-evaluator sha={head} -->')
        if not body.lower().startswith(markers) or '## Evaluator verdict' not in body:
            continue
        attribution = re.search(r'^[ \t>]*(?:\*{1,2})?Independent evaluator(?:\*{1,2})?\s*:(?:\*{1,2})?\s*(.+)$', body, re.M | re.I)
        if not attribution or not re.search(r'\bClaude\b', attribution[1], re.I):
            raise UnsafeEvidence('Current report lacks independent Claude attribution')
        first = next((x.strip() for x in body.split('## Evaluator verdict', 1)[1].splitlines() if x.strip()), '')
        match = re.match(r'^[\s*_>]*(PASS|FAIL|BLOCKED|INCONCLUSIVE)\b', first, re.I)
        if not match:
            raise UnsafeEvidence('Unreadable current-head evaluator report')
        round_.append((match[1].upper(), attests_local_verification(body, head)))
    verdicts = [r[0] for r in counted(round_)]
    if len(set(verdicts)) > 1:
        raise UnsafeEvidence('Contradictory current-head evaluator reports')
    return verdicts[-1] if verdicts else None


def local_verification_marker(pr):
    # Audit line a report records; same canonical body/labels tuple as scripts/owner-attention.mjs.
    metadata = hashlib.sha256(json.dumps([pr.get('body') or '', sorted(labels(pr)), pr['base']['ref']], ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    return f"<!-- local-verification: head={pr['head']['sha']} base={pr['base']['sha']} metadata={metadata} -->"


def local_checks(pr, trusted):
    """The independent PASS on the current head attests executed local checks."""
    live = pr.get('local_review', {})
    if live.get('head') != pr['head']['sha']:
        return 'pending'
    if live.get('checks', {}).get('state') == 'failure':
        return 'failure'
    if live.get('checks', {}).get('state') != 'success' or live.get('readiness', {}).get('ready') is not True:
        return 'pending'
    for comment in pr['comments']:
        head = pr['head']['sha'].lower()
        if evaluator([comment], head, trusted) == 'PASS' and attests_local_verification(comment.get('body', ''), head):
            return 'success'
    return 'pending'


def changed_requested(pr):
    latest = {}
    for review in pr['reviews']:
        if review['state'] in ('APPROVED', 'DISMISSED', 'CHANGES_REQUESTED'):
            latest[review['user']['login']] = review['state']
    return 'CHANGES_REQUESTED' in latest.values()


def classify(issue, prs, saved, config):
    result = {'issue': issue['number'], 'queued_at': saved.get('queued_at'), 'thread_id': saved.get('thread_id'), 'created_at': issue['created_at']}
    if issue['state'] == 'closed':
        return dict(result, state='merged_closed', queued_at=None)
    if 'epic' in labels(issue):
        return dict(result, state='evidence_blocked' if 'in-progress' in labels(issue) else 'ineligible', reason='Tracking parent is never executable')
    try:
        if owner(issue, prs) == 'claude':
            return dict(result, state='other_builder')
        if 'in-progress' in labels(issue) and any(a.get('login', '').lower() != config['builder_login'].lower() for a in issue.get('assignees', [])):
            raise UnsafeEvidence('Claim assignment contradicts configured Codex builder')
        if len(prs) > 1:
            raise UnsafeEvidence('Multiple canonical PRs for one issue')
        if prs and prs[0].get('merged_at'):
            return dict(result, state='merged_closed', queued_at=None)
        if 'blocked' in labels(issue):
            return dict(result, state='parked_blocked')
        if not prs:
            if saved.get('pr'):
                raise UnsafeEvidence('Registered PR missing from complete live evidence')
            if 'in-progress' in labels(issue):
                if saved.get('parked_at') or saved.get('state') in ('parked_blocked', 'blocked_verification_repair_limit'):
                    return dict(result, state='waiting_unparked')
                return dict(result, state='implementing_verifying')
            return dict(result, state='eligible' if 'ready-for-agent' in labels(issue) and not labels(issue).intersection({'epic', 'needs-triage', 'needs-info'}) and not issue.get('assignees') and not issue.get('dependencies_open') else 'ineligible')
        pr = prs[0]
        result.update(pr=pr['number'], head=pr['head']['sha'])
        if not pr['head']['ref'].startswith('codex/') or (pr['head'].get('repo') or {}).get('full_name', '').lower() != config['repo'].lower() or pr.get('user', {}).get('login', '').lower() != config['builder_login'].lower():
            raise UnsafeEvidence('Canonical Codex branch ownership is unreadable')
        if pr['state'] == 'closed':
            return dict(result, state='parked_closed_unmerged')
        if pr['draft']:
            return dict(result, state='implementing_verifying')
        verdict = evaluator(pr['comments'], pr['head']['sha'].lower(), config['trusted_evaluator_logins'])
        ci = local_checks(pr, config['trusted_evaluator_logins'])
        conflict = pr.get('mergeable') is False or pr.get('mergeable_state') == 'dirty'
        repair = ci == 'failure' or conflict or verdict == 'FAIL' or changed_requested(pr)
        if verdict == 'BLOCKED':
            return dict(result, state='parked_blocked')
        if repair:
            return dict(result, state='queued_repair' if result['queued_at'] else 'repair')
        if ci == 'success' and verdict == 'PASS' and pr.get('mergeable') is True and pr.get('mergeable_state') in ('clean', 'unstable', 'has_hooks'):
            # No historical PASS is used for admission. Timestamp comes from this snapshot.
            return dict(result, state='queued_awaiting_human', queued_at=result['queued_at'] or pr['observed_at'])
        if result['queued_at']:
            return dict(result, state='queued_rereview')
        return dict(result, state='waiting_first_evaluation' if verdict is None else 'waiting_local_verification')
    except (UnsafeEvidence, KeyError, TypeError) as error:
        return dict(result, state='evidence_blocked', reason=str(error))


def overlap(scope, reservations):
    """Scope must include direct paths AND inspected consumers/contracts. No exemptions."""
    for key in ('paths', 'consumers', 'contracts'):
        if key not in scope or not isinstance(scope[key], list):
            return ['Missing candidate consumer/contract assessment']
    hits = []
    for reservation in reservations:
        other = reservation.get('scope')
        if not other or any(k not in other or not isinstance(other[k], list) for k in ('paths', 'consumers', 'contracts')):
            hits.append(f"Unknown reserved scope: {reservation.get('identity')}")
            continue
        # Paths can be exact or directory prefixes. Reject wildcard/parent escapes.
        entries = scope['paths'] + scope['consumers'] + scope['contracts'] + other['paths'] + other['consumers'] + other['contracts']
        if any(not isinstance(p, str) for p in entries):
            hits.append('Invalid scope entry')
            continue
        left = set(scope['paths'] + scope['consumers'] + scope['contracts'])
        right = set(other['paths'] + other['consumers'] + other['contracts'])
        if any(not isinstance(p, str) or not p or '*' in p or '..' in p.split('/') or p.startswith('/') for p in left | right):
            hits.append('Invalid scope path')
            continue
        shared = {a for a in left for b in right if a == b or a.startswith(b.rstrip('/') + '/') or b.startswith(a.rstrip('/') + '/')}
        if shared:
            hits.append(f"{reservation['identity']}: {', '.join(sorted(shared))}")
    return hits


def investigation(candidates, evidence, head, config):
    eligible = [c for c in candidates if c.get('head') == head and c.get('independent') is True and c.get('question') and 0 < c.get('minutes', 0) <= config['investigation_minutes'] and c.get('kind') in ('review_preparation', 'regression', 'performance', 'accessibility', 'flaky', 'bottleneck', 'task_preparation') and not any(e.get('key') == c.get('key') and e.get('head') == head and e.get('question') == c['question'] and e.get('valid') is True for e in evidence)]
    eligible.sort(key=lambda c: (-c['impact'], -c['uncertainty'], c['minutes'], c.get('last_run', ''), c['key']))
    return eligible[0] if eligible else None


def route(states, reservations, candidates, evidence, head, config):
    validate_config(config)
    if any(s['state'] == 'evidence_blocked' for s in states):
        return {'action': 'blocked', 'reason': 'Unreadable or contradictory live evidence'}
    live = [s for s in states if s['state'] in ('implementing_verifying', 'waiting_local_verification', 'waiting_first_evaluation', 'repair')]
    if len(live) > 1:
        return {'action': 'blocked', 'reason': 'Multiple live Codex implementations'}
    repairs = [s for s in states if s['state'] in ('queued_repair', 'repair')]
    # Never interrupt a live implementation to run a second issue's repair.
    if live and live[0]['state'] == 'implementing_verifying':
        return {'action': 'continue', 'issue': live[0]['issue']}
    if repairs and not any(s['state'] in ('waiting_local_verification', 'waiting_first_evaluation') for s in live):
        return {'action': 'repair', 'issue': sorted(repairs, key=lambda s: (s['queued_at'] or s['created_at'], s['issue']))[0]['issue']}
    queued = [s for s in states if s['state'].startswith('queued_')]
    if not live and len(queued) < config['max_pass_queue'] and not repairs:
        waiting = sorted([s for s in states if s['state'] == 'waiting_unparked'], key=lambda s: (s['created_at'], s['issue']))
        fresh = sorted([s for s in states if s['state'] == 'eligible'], key=lambda s: (s['created_at'], s['issue']))
        for candidate in waiting + fresh:
            if not overlap(candidate.get('scope', {}), [r for r in reservations if r.get('issue') != candidate['issue']]):
                return {'action': 'resume' if candidate in waiting else 'initialize', 'issue': candidate['issue']}
    selected = investigation(candidates, evidence, head, config)
    return {'action': 'investigate', 'candidate': selected} if selected else {'action': 'wait', 'reason': 'No independent unanswered investigation or implementation'}


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def handoff(saved, intent, worker):
    """Intent is durable BEFORE release/send. Ambiguous delivery requires status reconciliation."""
    key = fingerprint(intent)
    if worker in ('running', 'unknown', 'pending_creation'):
        return {'send': False, 'reason': 'Worker state requires reconciliation'}
    if saved.get('dispatch_fingerprint') == key:
        return {'send': False, 'reason': 'Intent already recorded; reconcile delivery, never blindly resend'}
    if not saved.get('thread_id'):
        return {'send': False, 'reason': 'Recover existing mapping or initialize one real issue chat'}
    return {'send': True, 'dispatch_fingerprint': key, 'dispatch_intent': intent, 'thread_id': saved['thread_id']}


def finding_key(task, key):
    return f'{task}:{key}'


def admit_findings(findings, issues, config):
    existing = set()
    backlog = 0
    for issue in issues:
        body = issue.get('body', '')
        markers = re.findall(r'<!-- (?:claude|codex)-maintenance: (.*?) -->', body)
        existing.update(markers)
        if markers and issue['state'] == 'open':
            backlog += 1
    admitted = []
    for finding in sorted(findings, key=lambda f: (-f['impact'], f['key'])):
        key = finding_key(finding['task'], finding['key'])
        if backlog >= config['max_open_findings'] or len(admitted) >= config['max_findings_per_run']:
            break
        if key in existing or finding.get('environment_failure') or finding.get('reproductions', 0) < 2 or not finding.get('head') or not finding.get('evidence'):
            continue
        existing.add(key)
        admitted.append(finding)
        backlog += 1
    return admitted
