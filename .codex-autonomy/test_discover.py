import datetime
import hashlib
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

import discover
from router import fingerprint
from scope_check import assess
from test_router import CONFIG, HEAD, SCOPE, issue, pr


class DiscoveryTests(unittest.TestCase):
    def test_paginated_adapter_uses_current_head_not_saved_verdict(self):
        i = dict(issue(), title='feature', body=None, updated_at='now')
        p = dict(pr(), body='Closes #1')
        p['local_ci']['pr']['body'] = p['body']
        p['comments'] = []
        calls = []
        def api(path, pages=False):
            calls.append((path, pages))
            if '/issues?' in path: return [i]
            if '/pulls?' in path: return [p]
            if path.endswith('/commits/main'): return {'sha': HEAD}
            if path.endswith('/pulls/10'): return p.copy()
            if '/git/ref/heads/' in path: return {'object': {'sha': p['base']['sha']}}
            if '/pulls/10/files?' in path: return [{'filename': 'app/feature.vue'}]
            if '/comments?' in path or '/reviews?' in path or '/commits?' in path or '/statuses?' in path: return []
            self.fail('Unexpected API path ' + path)
        assessment = dict(SCOPE, head=HEAD)
        with patch.object(discover, 'gh', side_effect=api), patch.object(discover.subprocess, 'check_output', return_value=json.dumps([{'check_runs': p['checks']}])), patch.object(discover, 'local_ci_evidence', return_value=p['local_ci']), patch.object(discover, 'route', return_value={'action': 'wait'}):
            result = discover.snapshot(CONFIG, {'issues': {'1': {'independent_verdict': 'PASS'}}}, {'prs': {'10': assessment}})
        self.assertEqual(result['states'][0]['state'], 'waiting_first_evaluation')
        self.assertEqual(result['reservations'][0]['scope'], assessment)
        self.assertTrue(all(pages for path, pages in calls if '?' in path), 'Collection endpoints must paginate, not silently truncate')

    def test_actual_expansion_and_stale_live_block_publication(self):
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        live = {'observed_at': now, 'reservations': []}
        cert = dict(SCOPE, diff_sha256=hashlib.sha256(b'patch').hexdigest())
        def command(args, **kwargs):
            if '--binary' in args: return b'patch'
            if '--name-only' in args: return 'app/feature.vue\n'
            if 'ls-files' in args: return ''
            return HEAD
        with patch('scope_check.subprocess.check_output', side_effect=command):
            self.assertEqual(assess(pathlib.Path('.'), HEAD, cert, live, 1)['scope'], 'independent')
            with self.assertRaises(ValueError): assess(pathlib.Path('.'), HEAD, dict(cert, diff_sha256='stale'), live, 1)
            with self.assertRaises(ValueError): assess(pathlib.Path('.'), HEAD, dict(cert, paths=[]), live, 1)
            with self.assertRaises(ValueError): assess(pathlib.Path('.'), HEAD, cert, dict(live, observed_at='2000-01-01T00:00:00+00:00'), 1)
            with self.assertRaises(ValueError): assess(pathlib.Path('.'), HEAD, cert, dict(live, reservations=[{'identity': 'draft', 'scope': SCOPE}]), 1)


if __name__ == '__main__':
    unittest.main()
