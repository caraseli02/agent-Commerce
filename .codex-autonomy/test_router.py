import copy
import json
import pathlib
import unittest

from router import attests_local_verification, local_verification_marker, UnsafeEvidence, admit_findings, classify, evaluator, fingerprint, handoff, overlap, route
from discover import registry_report

CONFIG = json.loads(pathlib.Path(__file__).with_name('config.json').read_text())
HEAD = 'a' * 40
SCOPE = {'paths': ['app/feature.vue'], 'consumers': ['app/pages/feature.vue'], 'contracts': ['types/feature.ts']}


def report(verdict='PASS', head=HEAD, login='caraseli02', who='Claude (separate reviewer)'):
    return {'user': {'login': login}, 'body': f'<!-- evaluator-head: {head} -->\nIndependent evaluator: {who}\n## Evaluator verdict\n{verdict} — evidence'}


def marked(comment, value):
    return dict(comment, body=comment['body'] + '\n' + local_verification_marker(value))


def issue(number=1, claimed=True):
    return {'number': number, 'state': 'open', 'labels': ['in-progress'] if claimed else ['ready-for-agent'], 'comments': [{'author_association': 'OWNER', 'body': 'Claimed by Codex'}] if claimed else [], 'created_at': f'2026-01-{number:02}T00:00:00Z', 'assignees': []}


def pr():
    value = {'number': 10, 'base': {'ref': 'main', 'sha': 'b' * 40}, 'head': {'sha': HEAD, 'ref': 'codex/1-feature', 'repo': {'full_name': CONFIG['repo']}}, 'user': {'login': CONFIG['builder_login']}, 'state': 'open', 'draft': False, 'merged_at': None, 'mergeable': True, 'mergeable_state': 'clean', 'comments': [report()], 'reviews': [], 'observed_at': 'now'}
    value['comments'][0]['body'] += '\n' + local_verification_marker(value)
    value['local_review'] = {'head': HEAD, 'base': value['base']['sha'], 'marker': local_verification_marker(value), 'checks': {'state': 'success'}, 'readiness': {'ready': True}}
    return value



class RoutingTests(unittest.TestCase):
    def state(self, i=None, p=None, saved=None):
        return classify(i or issue(), [p or pr()], saved or {}, CONFIG)

    def test_exact_pass_allows_independent_next(self):
        queued = self.state()
        candidate = classify(issue(2, False), [], {}, CONFIG)
        candidate['scope'] = SCOPE
        self.assertEqual(route([queued, candidate], [], [], [], HEAD, CONFIG), {'action': 'initialize', 'issue': 2})

    def test_two_queued_select_one_risk_investigation(self):
        second = self.state(issue(2))
        candidates = [{'key': 'risk', 'head': HEAD, 'question': 'Can keyboard open cart?', 'kind': 'accessibility', 'independent': True, 'minutes': 30, 'impact': 4, 'uncertainty': 3}]
        decision = route([self.state(), second], [], candidates, [], HEAD, CONFIG)
        self.assertEqual(decision['action'], 'investigate')
        self.assertEqual(route([self.state(), second], [], candidates, [dict(candidates[0], valid=True)], HEAD, CONFIG)['action'], 'wait')

    def test_parked_and_oldest_unparked_before_fresh(self):
        parked = classify(dict(issue(), labels=['in-progress', 'blocked']), [], {}, CONFIG)
        waiting = classify(issue(2), [], {'parked_at': 'old'}, CONFIG)
        fresh = classify(issue(3, False), [], {}, CONFIG)
        waiting['scope'] = fresh['scope'] = SCOPE
        self.assertEqual(route([parked, waiting, fresh], [], [], [], HEAD, CONFIG), {'action': 'resume', 'issue': 2})

    def test_pending_first_evaluation_holds_slot(self):
        p = pr(); p['comments'] = []
        pending = self.state(p=p)
        self.assertEqual(pending['state'], 'waiting_first_evaluation')
        fresh = classify(issue(2, False), [], {}, CONFIG); fresh['scope'] = SCOPE
        self.assertEqual(route([pending, fresh], [], [], [], HEAD, CONFIG)['action'], 'wait')

    def test_stale_pass_never_admits(self):
        p = pr(); p['comments'] = [report(head='b' * 40)]
        self.assertIsNone(self.state(p=p)['queued_at'])
        self.assertEqual(self.state(p=p, saved={'queued_at': 'old'})['state'], 'queued_rereview')

    def test_queue_identity_and_repairs_priority(self):
        p = pr(); p['comments'] = [report('FAIL')]
        repair = self.state(p=p, saved={'queued_at': 'old', 'thread_id': 'original'})
        self.assertEqual(repair['state'], 'queued_repair')
        self.assertEqual(repair['thread_id'], 'original')
        self.assertEqual(route([repair], [], [], [], HEAD, CONFIG), {'action': 'repair', 'issue': 1})

    def test_live_implementation_not_interrupted_by_second_repair(self):
        live = classify(issue(2), [], {}, CONFIG)
        p = pr(); p['comments'] = [report('FAIL')]
        self.assertEqual(route([live, self.state(p=p, saved={'queued_at': 'old'})], [], [], [], HEAD, CONFIG), {'action': 'continue', 'issue': 2})

    def test_closed_unmerged_parks_and_merge_cleans(self):
        p = pr(); p['state'] = 'closed'
        self.assertEqual(self.state(p=p)['state'], 'parked_closed_unmerged')
        p['merged_at'] = 'now'
        s = self.state(p=p, saved={'queued_at': 'old'})
        self.assertEqual(s['state'], 'merged_closed'); self.assertIsNone(s['queued_at'])

    def test_contradictions_unknown_and_duplicate_fail_closed(self):
        p = pr(); conflicting = report('FAIL'); conflicting['body'] += '\n' + local_verification_marker(p); p['comments'].append(conflicting)
        self.assertEqual(self.state(p=p)['state'], 'evidence_blocked')
        p = pr(); p['labels'] = ['agent:claude']
        self.assertEqual(self.state(p=p)['state'], 'evidence_blocked')
        self.assertEqual(classify(issue(), [pr(), pr()], {}, CONFIG)['state'], 'evidence_blocked')
        self.assertEqual(classify(issue(), [], {'pr': 10}, CONFIG)['state'], 'evidence_blocked')

    def test_untrusted_self_request_and_truncated_marker_rejected(self):
        self.assertIsNone(evaluator([report(login='outsider')], HEAD, CONFIG['trusted_evaluator_logins']))
        self.assertIsNone(evaluator([report(head=HEAD[:8])], HEAD, CONFIG['trusted_evaluator_logins']))
        c = report(); c['body'] = 'Please review\n' + c['body']
        self.assertIsNone(evaluator([c], HEAD, CONFIG['trusted_evaluator_logins']))
        p = pr(); p['comments'] = [report(who='Sol builder')]
        self.assertEqual(self.state(p=p)['state'], 'evidence_blocked')

    def test_local_verification_missing_mergeability_and_requests(self):
        p = pr(); p['local_review']['readiness'] = {'ready': False}
        self.assertEqual(self.state(p=p)['state'], 'waiting_local_verification')
        p = pr(); p['comments'][0]['body'] = report()['body']
        self.assertEqual(self.state(p=p)['state'], 'waiting_local_verification')
        p = pr(); p['mergeable'] = None
        self.assertNotEqual(self.state(p=p)['state'], 'queued_awaiting_human')
        p = pr(); p['reviews'] = [{'state': 'CHANGES_REQUESTED', 'user': {'login': 'human'}}]
        self.assertEqual(self.state(p=p)['state'], 'repair')

    def test_base_body_and_label_drift_keep_the_head_verdict_and_retired_ci_is_irrelevant(self):
        for field, value in [('body', 'changed'), ('labels', ['changed'])]:
            p = pr(); p[field] = value
            self.assertEqual(self.state(p=p)['state'], 'queued_awaiting_human', field)
        p = pr(); p['base']['sha'] = 'f' * 40
        self.assertEqual(self.state(p=p)['state'], 'queued_awaiting_human')
        p = pr(); p['checks'] = []; p['statuses'] = [{'context': 'local-ci/verify', 'state': 'failure'}]
        self.assertEqual(self.state(p=p)['state'], 'queued_awaiting_human')

    def test_live_template_failure_and_context_race_block_queue_admission(self):
        p = pr(); p['local_review']['checks']['state'] = 'failure'
        self.assertEqual(self.state(p=p)['state'], 'repair')
        for key, value in [('head', 'f' * 40), ('readiness', {'ready': False})]:
            p = pr(); p['local_review'][key] = value
            self.assertNotEqual(self.state(p=p)['state'], 'queued_awaiting_human', key)

    def test_re_review_request_reopens_fail_or_blocked_but_never_pass(self):
        request = {'user': {'login': 'caraseli02'}, 'body': f'<!-- external-review-request: {HEAD} -->\nPR body fixed.'}
        for first in ('FAIL', 'BLOCKED'):
            p = pr(); p['comments'][:0] = [report(first), request]
            self.assertEqual(self.state(p=p)['state'], 'queued_awaiting_human', first)
            p = pr(); p['comments'] = [report(first), request]
            self.assertEqual(self.state(p=p)['state'], 'waiting_first_evaluation', first)
        p = pr(); p['comments'].insert(0, marked(report('FAIL'), p))
        self.assertEqual(self.state(p=p)['state'], 'evidence_blocked')
        p = pr(); p['comments'] += [request, marked(report('FAIL'), p)]
        self.assertEqual(self.state(p=p)['state'], 'evidence_blocked')
        fails = [report('FAIL'), request, report('FAIL')]
        self.assertEqual(evaluator(fails, HEAD, CONFIG['trusted_evaluator_logins']), 'FAIL')
        self.assertIsNone(evaluator(fails + [request], HEAD, CONFIG['trusted_evaluator_logins']))

    def test_audit_line_attests_and_supersedes_legacy_reports(self):
        p = pr(); p['comments'].insert(0, report('FAIL'))
        self.assertEqual(self.state(p=p)['state'], 'queued_awaiting_human')
        p = pr(); p['comments'].append(report('FAIL'))
        self.assertEqual(self.state(p=p)['state'], 'queued_awaiting_human')
        line = local_verification_marker(pr())
        self.assertTrue(attests_local_verification('x\n' + line, HEAD))
        for body in ('> ' + line, line + ' trailing', line.replace(f'head={HEAD}', 'head=' + 'b' * 40), 'no line'):
            self.assertFalse(attests_local_verification(body, HEAD), body)

    def test_unpublished_drafts_contracts_global_paths_not_exempt(self):
        for path in ['pnpm-lock.yaml', 'tests/shared.spec.ts', 'nuxt.config.ts', 'migrations/001.sql', 'types/shared.ts']:
            s = dict(SCOPE, paths=[path])
            self.assertTrue(overlap(s, [{'identity': 'draft/unpublished', 'scope': s}]))
        other = dict(SCOPE, paths=['another.vue'])
        self.assertTrue(overlap(SCOPE, [{'identity': 'different folder same contract', 'scope': other}]))
        self.assertTrue(overlap(SCOPE, [{'identity': 'unknown PR scope', 'scope': None}]))
        self.assertTrue(overlap(dict(SCOPE, paths=['app/']), [{'identity': 'prefix', 'scope': SCOPE}]))

    def test_multiple_live_claims_block(self):
        states = [classify(issue(n), [], {}, CONFIG) for n in (1, 2)]
        self.assertEqual(route(states, [], [], [], HEAD, CONFIG)['action'], 'blocked')

    def test_config_cannot_expand_approved_caps(self):
        for invalid in ({'max_pass_queue': 3}, {'investigation_minutes': 60}, {'max_findings_per_run': 4}, {'max_open_findings': 6}):
            with self.assertRaises(UnsafeEvidence): route([], [], [], [], HEAD, dict(CONFIG, **invalid))

    def test_tracking_parent_with_multiple_child_prs_is_not_executable(self):
        tracking = dict(issue(), labels=['epic'])
        self.assertEqual(classify(tracking, [pr(), pr()], {}, CONFIG)['state'], 'ineligible')
        self.assertEqual(classify(dict(tracking, labels=['epic', 'in-progress']), [], {}, CONFIG)['state'], 'evidence_blocked')

    def test_fork_and_conflicting_assignment_are_not_canonical(self):
        p = pr(); p['head']['repo']['full_name'] = 'outsider/agent-Commerce'
        self.assertEqual(self.state(p=p)['state'], 'evidence_blocked')
        p = pr(); p['user']['login'] = 'outsider'
        self.assertEqual(self.state(p=p)['state'], 'evidence_blocked')
        self.assertEqual(classify(dict(issue(), assignees=[{'login': 'someone-else'}]), [], {}, CONFIG)['state'], 'evidence_blocked')

    def test_handoff_duplicate_ambiguous_running_real_mapping(self):
        intent = {'issue': 1, 'head': HEAD, 'action': 'repair'}
        saved = {'thread_id': 'real'}
        result = handoff(saved, intent, 'idle')
        self.assertTrue(result['send'])
        saved.update(result)
        self.assertFalse(handoff(saved, intent, 'idle')['send'])
        self.assertFalse(handoff({}, intent, 'idle')['send'])
        self.assertFalse(handoff({'thread_id': 'real'}, intent, 'running')['send'])
        self.assertFalse(handoff({'thread_id': 'real'}, intent, 'unknown')['send'])

    def test_cross_builder_open_closed_dedup_limits_environment(self):
        f = {'task': 'performance', 'key': 'cart-open', 'head': HEAD, 'evidence': 'two traces', 'impact': 4, 'reproductions': 2}
        history = [{'state': 'closed', 'body': '<!-- claude-maintenance: performance:cart-open -->'}]
        self.assertEqual(admit_findings([f], history, CONFIG), [])
        self.assertEqual(admit_findings([dict(f, environment_failure=True)], [], CONFIG), [])
        fs = [dict(f, key=str(n)) for n in range(6)]
        self.assertEqual(len(admit_findings(fs, [], CONFIG)), 3)
        backlog = [{'state': 'open', 'body': f'<!-- codex-maintenance: performance:old{n} -->'} for n in range(5)]
        self.assertEqual(admit_findings(fs, backlog, CONFIG), [])

    def test_registry_preserves_history_not_live_acceptance(self):
        registry = {'issues': {'1': {'thread_id': 'real', 'independent_verdict': 'PASS', 'history': [1]}}}
        s = self.state(saved=registry['issues']['1'])
        result = registry_report(registry, {'states': [s], 'observed_at': 'now', 'decision': {'action': 'wait'}})
        self.assertEqual(result['issues']['1']['history'], [1])
        self.assertEqual(result['issues']['1']['routing_report'], s)
        self.assertNotIn('queued_at', registry['issues']['1'])


if __name__ == '__main__':
    unittest.main()
