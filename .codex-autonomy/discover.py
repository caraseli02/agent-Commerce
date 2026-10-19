"""Read-only complete GitHub discovery. Run through the existing native lease."""
import argparse
import datetime
import json
import pathlib
import subprocess

from router import classify, closing_numbers, fingerprint, route
from scope_check import working_scope


def gh(path, pages=False):
    args = ['gh', 'api', path]
    if pages:
        args += ['--paginate', '--slurp']
    result = json.loads(subprocess.check_output(args, text=True))
    return [item for page in result for item in page] if pages else result


def snapshot(config, registry, assessments):
    repo = config['repo']
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    issues = [i for i in gh(f'repos/{repo}/issues?state=all&per_page=100', True) if 'pull_request' not in i]
    prs = gh(f'repos/{repo}/pulls?state=all&per_page=100', True)
    main = gh(f'repos/{repo}/commits/main')['sha']
    reservations = []
    by_issue = {}
    orphan_codex = []
    open_numbers = {i['number'] for i in issues if i['state'] == 'open'}
    for pr in prs:
        linked = closing_numbers(pr.get('body', ''))
        # Registered canonical PR is included even if its body was edited.
        linked.update(int(n) for n, s in registry['issues'].items() if s.get('pr') == pr['number'])
        if pr['state'] != 'open' and not linked.intersection(open_numbers):
            continue
        detail = gh(f'repos/{repo}/pulls/{pr["number"]}')
        commits = gh(f'repos/{repo}/pulls/{pr["number"]}/commits?per_page=100', True)
        detail['claude_coauthor'] = any('Co-Authored-By: Claude' in c['commit']['message'] for c in commits)
        detail['comments'] = gh(f'repos/{repo}/issues/{pr["number"]}/comments?per_page=100', True)
        detail['reviews'] = gh(f'repos/{repo}/pulls/{pr["number"]}/reviews?per_page=100', True)
        sha = detail['head']['sha']
        detail['observed_at'] = now
        if detail['state'] == 'open':
            from urllib.parse import quote
            detail['base']['sha'] = gh(f'repos/{repo}/git/ref/heads/{quote(detail["base"]["ref"], safe="")}')['object']['sha']
        for n in linked:
            by_issue.setdefault(n, []).append(detail)
        if detail['state'] == 'open':
            if detail['head']['ref'].startswith('codex/') and not linked:
                orphan_codex.append({'issue': None, 'state': 'evidence_blocked', 'reason': 'Open Codex PR has no canonical executable issue', 'queued_at': None})
            files = gh(f'repos/{repo}/pulls/{pr["number"]}/files?per_page=100', True)
            # GitHub caps diff files at 3000; refuse the truncated boundary.
            scope = assessments.get('prs', {}).get(str(pr['number']))
            paths = {name for f in files for name in (f['filename'], f.get('previous_filename')) if name}
            valid = scope and scope.get('head') == sha and paths.issubset(set(scope.get('paths', []))) and len(files) < 3000
            reservations.append({'identity': f'PR{pr["number"]}@{sha}', 'issue': next(iter(linked)) if len(linked) == 1 else None, 'scope': scope if valid else None})
    states = []
    for issue in issues:
        if issue['state'] != 'open' and str(issue['number']) not in registry['issues']:
            continue
        issue['comments'] = gh(f'repos/{repo}/issues/{issue["number"]}/comments?per_page=100', True)
        dependencies = []
        for line in (issue.get('body') or '').splitlines():
            if line.lower().strip().startswith(('blocked by:', 'depends on:')):
                dependencies += [int(n) for n in __import__('re').findall(r'#(\d+)', line)]
                if not dependencies and not line.lower().strip().endswith('none.') and not line.lower().strip().endswith('none'):
                    dependencies.append(-1)  # prose dependency requires explicit clarification
        known_numbers = {i['number'] for i in issues}
        issue['dependencies_open'] = bool((issue.get('issue_dependencies_summary') or {}).get('blocked_by', 0)) or any(n in open_numbers or n not in known_numbers for n in dependencies)
        saved = registry['issues'].get(str(issue['number']), {})
        state = classify(issue, by_issue.get(issue['number'], []), saved, config)
        assessment = assessments.get('issues', {}).get(str(issue['number']))
        if assessment and assessment.get('issue_fingerprint') == fingerprint({k: issue.get(k) for k in ('title', 'body', 'labels', 'updated_at')}):
            state['scope'] = assessment
        states.append(state)
        if saved.get('worktree') and state['state'] != 'merged_closed':
            # Unpublished scope must be assessed against the actual working diff.
            tree = pathlib.Path(saved['worktree'])
            try:
                base = saved['base_at_implementation']
                actual = working_scope(tree, base)
                scope = assessments.get('unpublished', {}).get(str(issue['number']))
                valid = scope and scope.get('diff_sha256') == actual['diff_sha256'] and set(actual['paths']).issubset(set(scope.get('paths', [])))
            except (KeyError, ValueError, OSError, subprocess.CalledProcessError):
                valid = False
                scope = None
            reservations.append({'identity': f'unpublished#{issue["number"]}', 'issue': issue['number'], 'scope': scope if valid else None})
    states += orphan_codex
    decision = route(states, reservations, assessments.get('investigations', []), registry.get('investigation_evidence', []), main, config)
    return {'version': 1, 'observed_at': now, 'main': main, 'states': states, 'reservations': reservations, 'decision': decision, 'cleanup': [s['issue'] for s in states if s['state'] == 'merged_closed']}


def registry_report(registry, live):
    result = json.loads(json.dumps(registry))
    for state in live['states']:
        key = str(state['issue'])
        if key not in result['issues']:
            continue
        saved = result['issues'][key]
        saved['routing_report'] = state
        saved['routing_observed_at'] = live['observed_at']
        saved['queued_at'] = state['queued_at']
        if state['state'].startswith('parked_'):
            saved.setdefault('parked_at', live['observed_at'])
        elif state['state'] == 'merged_closed':
            saved.pop('parked_at', None)
    result['routing_version'] = 1
    result['routing_decision'] = live['decision']
    # Retain all legacy fields/history; the reporting cache does not mutate claims.
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--registry', type=pathlib.Path, required=True)
    parser.add_argument('--lease-token', required=True)
    parser.add_argument('--assessments', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--config', type=pathlib.Path, default=pathlib.Path(__file__).with_name('config.json'))
    args = parser.parse_args()
    from lease_guard import require_registered_lease
    require_registered_lease(args.lease_token)
    config = json.loads(args.config.read_text())
    registry = json.loads(args.registry.read_text())
    live = snapshot(config, registry, json.loads(args.assessments.read_text()))
    args.output.write_text(json.dumps(live, indent=2) + '\n')
    args.output.with_suffix('.registry.json').write_text(json.dumps(registry_report(registry, live), indent=2) + '\n')
    print(json.dumps(live['decision']))


if __name__ == '__main__':
    main()
