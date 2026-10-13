import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

from install import FILES, install_merged, migrate_registry, stage


class InstallTests(unittest.TestCase):
    def test_stage_only_and_history_preservation(self):
        with tempfile.TemporaryDirectory() as root:
            target = pathlib.Path(root) / 'stage'
            manifest = stage(pathlib.Path(__file__).parent, target)
            self.assertEqual(set(manifest), set(FILES))
            self.assertTrue((target / 'manifest.json').exists())
        original = {'version': 1, 'active_issue': 482, 'issues': {'482': {'state': 'blocked', 'worktree': 'preserve', 'history': [1]}, '454': {'independent_verdict': 'PASS'}}}
        result = migrate_registry(original)
        self.assertEqual(result['active_issue'], 482)
        self.assertEqual(result['issues']['482']['history'], [1])
        self.assertEqual(result['issues']['482']['worktree'], 'preserve')
        self.assertNotIn('queued_at', result['issues']['454'])
        self.assertNotIn('routing_version', original)

    def test_unmerged_source_cannot_activate_or_touch_host(self):
        with tempfile.TemporaryDirectory() as root:
            host = pathlib.Path(root)
            with patch('install.subprocess.run'), patch('install.subprocess.check_output', return_value='other-head'):
                with self.assertRaises(ValueError): install_merged(pathlib.Path(__file__).parent, host, 'merged-sha', 100)
            self.assertEqual(list(host.iterdir()), [])

    def test_verified_install_preserves_flags_history_and_scheduler(self):
        with tempfile.TemporaryDirectory() as root:
            host = pathlib.Path(root)
            settings = {'builder_enabled': True, 'reviewer_enabled': False, 'custom': 'retain'}
            registry = {'version': 1, 'active_issue': 482, 'issues': {'482': {'history': [1], 'state': 'blocked'}}}
            (host / 'settings.json').write_text(json.dumps(settings))
            (host / 'issue-chats.json').write_text(json.dumps(registry))
            for name in ('dispatcher-workflow.md', 'native-workflow.md'):
                (host / name).write_text('old workflow')
            def output(args, **_):
                if args[:2] == ['git', 'rev-parse']: return 'merged'
                if args[:2] == ['git', 'status']: return ''
                return json.dumps({'merged_at': 'now', 'merge_commit_sha': 'merged', 'body': 'Closes #682'})
            with patch('install.subprocess.run'), patch('install.subprocess.check_output', side_effect=output):
                result = install_merged(pathlib.Path(__file__).parent, host, 'merged', 999)
            installed = json.loads((host / 'settings.json').read_text())
            self.assertEqual(installed['reviewer_enabled'], False)
            self.assertEqual(installed['custom'], 'retain')
            self.assertEqual(json.loads((host / 'issue-chats.json').read_text())['issues']['482']['history'], [1])
            self.assertFalse(result['automation_updated'])
            self.assertEqual((pathlib.Path(result['backup']) / 'dispatcher-workflow.md').read_text(), 'old workflow')


if __name__ == '__main__':
    unittest.main()
