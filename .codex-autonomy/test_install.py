"""Temporary-host migration regressions. No installed host assets are written."""
import json
import os
import pathlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import install
import native_lease


class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name).resolve()
        self.source = self.root / 'repo/.codex-autonomy'
        self.source.mkdir(parents=True)
        actual = pathlib.Path(install.__file__).parent
        for name, value in install.source_bytes(actual).items():
            target = (self.source.parent if '/' in name else self.source) / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(value)
        self.host = self.root / 'host'; self.host.mkdir()
        profile = json.loads((self.source / 'migration-profile.json').read_text())
        for name in profile['policy_sha256']:
            value = ((self.source / name).read_bytes() if name == 'native_lease.py' else
                     ('Owner policy: ' + name + '\nPreserve cleanup, model delegation and local independent review\n').encode())
            (self.host / name).write_bytes(value)
            profile['policy_sha256'][name] = install.digest(value)
        (self.source / 'migration-profile.json').write_bytes(install.encoded(profile))
        self.settings = {'builder_enabled': True, 'reviewer_enabled': False, 'native_execution_ready': True,
                         'lease_protocol': 2, 'custom': {'retain': [1]}, 'reviewer_model': 'unchanged'}
        self.registry = {'version': 1, 'active_issue': 482, 'dispatch_intent': {'preserve': True},
                         'issues': {'482': {'state': 'blocked', 'history': [1], 'worktree': 'unpublished'},
                                    '454': {'independent_verdict': 'PASS'}}}
        (self.host / 'settings.json').write_bytes(install.encoded(self.settings))
        (self.host / 'issue-chats.json').write_bytes(install.encoded(self.registry))
        (self.host / 'native').mkdir()
        (self.host / 'native/builder.lock').touch()
        self.inode = (self.host / 'native/builder.lock').stat().st_ino
        self.lease = {'thread': 'self-chat', 'generation': 'generation', 'protocol': 2,
                      'lock_device': (self.host / 'native/builder.lock').stat().st_dev, 'lock_inode': self.inode}
        self.merge = 'a' * 40
        self.identity = {'repo': 'caraseli02/agent-Commerce', 'issue': 830, 'pr': 900,
                         'merge': self.merge, 'reviewed_head': 'b' * 40}
        self.identity_patch = patch('install.release_identity', return_value=self.identity)
        self.lease_patch = patch('install.lease_snapshot', return_value=self.lease)
        self.identity_patch.start(); self.lease_patch.start()
        self.addCleanup(self.identity_patch.stop); self.addCleanup(self.lease_patch.stop)
        self.addCleanup(self.temp.cleanup)

    def snapshot(self):
        return {str(p.relative_to(self.host)): p.read_bytes() for p in self.host.rglob('*') if p.is_file()}

    def plan(self):
        return install.plan_migration(self.source, self.host, self.merge, 900, 'own-token', 'self-chat')

    def activate(self, plan):
        return install.install_merged(self.source, self.host, self.merge, 900, plan, plan['digest'], 'own-token', 'self-chat')

    def test_stage_and_plan_are_nonmutating_with_exact_hashes_and_rendering(self):
        before = self.snapshot()
        staged = self.root / 'staged'
        self.assertEqual(install.stage(self.source, staged, self.host), install.manifest(self.source))
        plan = self.plan(); install.verify_plan(plan)
        self.assertEqual(plan['source'], json.loads((staged / 'manifest.json').read_text()))
        for name in ('dispatcher-workflow.md', 'native-workflow.md'):
            self.assertTrue(plan['rendered'][name].startswith((self.host / name).read_text()))
            for policy in ('five hours', 'six hours', 'gpt-6-luna', 'Husky', 'opposite-builder', 'lease-cleanup.md', 'reporting/freshness'):
                self.assertIn(policy, plan['rendered'][name])
        self.assertEqual(before, self.snapshot())
        with self.assertRaises(ValueError): install.stage(self.source, self.host / 'stage', self.host)

    def test_activation_requires_explicit_approval_and_rejects_corrupt_plan(self):
        before = self.snapshot()
        with self.assertRaises(ValueError): install.install_merged(self.source, self.host, self.merge, 900)
        plan = self.plan(); plan['rendered']['settings.json'] = '{}'
        with self.assertRaises(ValueError): self.activate(plan)
        self.assertEqual(before, self.snapshot())

    def test_stale_settings_source_registry_policy_and_lease_reject_before_writes(self):
        cases = [('settings.json', self.host), ('issue-chats.json', self.host),
                 ('model-delegation.md', self.host), ('migration-policy.md', self.source)]
        for name, folder in cases:
            with self.subTest(name=name):
                plan = self.plan(); path = folder / name; old = path.read_bytes()
                path.write_bytes(old + b'\n')
                before = self.snapshot()
                with self.assertRaises(ValueError): self.activate(plan)
                self.assertEqual(before, self.snapshot())
                path.write_bytes(old)
        plan = self.plan(); before = self.snapshot()
        with patch('install.lease_snapshot', return_value=self.lease | {'generation': 'other'}):
            with self.assertRaises(ValueError): self.activate(plan)
        self.assertEqual(before, self.snapshot())

    def test_unknown_helper_schema_profile_and_symlink_fail_closed(self):
        for name in ('native_lease.py', 'concurrent-review.md'):
            path = self.host / name; old = path.read_bytes(); path.write_bytes(b'unknown')
            with self.assertRaises(ValueError): self.plan()
            path.write_bytes(old)
        (self.host / 'settings.json').write_bytes(install.encoded(self.settings | {'lease_protocol': 3}))
        with self.assertRaises(ValueError): self.plan()
        (self.host / 'settings.json').write_bytes(install.encoded(self.settings))
        path = self.host / 'model-delegation.md'; saved = self.root / 'saved'; path.rename(saved); path.symlink_to(saved)
        with self.assertRaises(ValueError): self.plan()

    def test_install_preserves_helper_inode_flags_history_and_independent_lane(self):
        before = self.snapshot(); plan = self.plan()
        reviewer = self.host / 'reviewer/native'; reviewer.mkdir(parents=True)
        (reviewer / 'journal.jsonl').write_text('new unrelated reviewer entry\n')
        (self.host / 'native/recovery.json').write_text('{"version":1,"owners":{}}')
        cleanup = self.host / 'native/lease-cleanup'; cleanup.mkdir()
        (cleanup / 'old.json').write_text('{"version":1,"generation":"old","thread":"prior-owner","purpose":"work","state":"ambiguous"}')
        preserved = self.snapshot()
        result = self.activate(plan)
        for name, value in preserved.items():
            if name not in install.WRITE_SET: self.assertEqual((self.host / name).read_bytes(), value)
        self.assertEqual((self.host / 'native/builder.lock').stat().st_ino, self.inode)
        settings = json.loads((self.host / 'settings.json').read_text())
        for key, value in self.settings.items(): self.assertEqual(settings[key], value)
        self.assertFalse(settings['watched_recovery_accepted']); self.assertFalse(result['helper_replaced'])
        self.assertEqual(settings['routing_config']['cadence_hours'], 5)
        self.assertFalse(result['automation_updated'])
        backup = pathlib.Path(result['backup'])
        self.assertEqual(backup.stat().st_mode & 0o777, 0o700)
        for name in install.WRITE_SET:
            if name in before: self.assertEqual((backup / name).read_bytes(), before[name])

    def test_failure_after_first_write_restores_only_installation_assets(self):
        before = self.snapshot(); plan = self.plan(); original = install.atomic_write
        failed = []
        def fail(target, data):
            if target == self.host / 'dispatcher-workflow.md' and not failed:
                failed.append(True)
                # New task history is never part of rollback.
                (self.host / 'issue-chats.json').write_text('{"newer":"preserved"}')
                raise OSError('controlled replacement failure')
            return original(target, data)
        with patch('install.atomic_write', side_effect=fail):
            with self.assertRaises(OSError): self.activate(plan)
        self.assertEqual((self.host / 'settings.json').read_bytes(), before['settings.json'])
        self.assertEqual((self.host / 'issue-chats.json').read_text(), '{"newer":"preserved"}')
        self.assertEqual((self.host / 'native_lease.py').read_bytes(), before['native_lease.py'])
        for name in install.WRITE_SET:
            self.assertEqual(install.content(self.host / name), before.get(name))

    def test_rollback_preserves_new_history_but_refuses_new_installation_asset_drift(self):
        result = self.activate(self.plan()); backup = pathlib.Path(result['backup'])
        (self.host / 'issue-chats.json').write_text('{"new":"task"}')
        current = (self.host / 'settings.json').read_bytes()
        (self.host / 'settings.json').write_bytes(current + b'\n')
        with self.assertRaises(ValueError): install.rollback_installation(self.host, backup, 'own-token', 'self-chat')
        self.assertTrue((self.host / 'investigation-workflow.md').exists())
        (self.host / 'settings.json').write_bytes(current)
        install.rollback_installation(self.host, backup, 'own-token', 'self-chat')
        self.assertEqual(json.loads((self.host / 'settings.json').read_text()), self.settings)
        self.assertEqual((self.host / 'issue-chats.json').read_text(), '{"new":"task"}')
        self.assertFalse((self.host / 'investigation-workflow.md').exists())

    def test_unrecoverable_asset_failure_reports_private_reconciliation_evidence(self):
        plan = self.plan(); original = install.atomic_write
        def fail(target, data):
            if target == self.host / 'dispatcher-workflow.md':
                raise OSError('controlled activation and rollback failure')
            return original(target, data)
        with patch('install.atomic_write', side_effect=fail):
            with self.assertRaisesRegex(RuntimeError, 'Recoverable partial installation'):
                self.activate(plan)
        events = [json.loads(line) for line in (self.host / 'native/installations/journal.jsonl').read_text().splitlines()]
        self.assertEqual(events[-1]['event'], 'reconciliation_required')
        self.assertTrue((pathlib.Path(events[-1]['backup']) / 'backup.json').exists())
        self.assertEqual(json.loads((self.host / 'issue-chats.json').read_text()), self.registry)

    def test_unknown_delivery_schema_blocks_plan_without_freezing_valid_append_history(self):
        path = self.host / 'native/recovery.json'
        path.write_text('{"version":99,"owners":{}}')
        before = self.snapshot()
        with self.assertRaises(ValueError): self.plan()
        self.assertEqual(before, self.snapshot())
        path.write_text('{"version":1,"owners":{}}')
        plan = self.plan()
        path.write_text('{"version":1,"owners":{"later":{"state":"ambiguous"}}}')
        self.assertEqual(self.plan(), plan)

    def test_release_admission_binds_repository_exact_merge_closing_issue_and_head(self):
        self.identity_patch.stop()
        pr = {'number': 900, 'merged_at': 'now', 'merged_by': {'login': 'caraseli02'}, 'merge_commit_sha': self.merge, 'body': 'Closes #830',
              'base': {'ref': 'main', 'repo': {'full_name': 'caraseli02/agent-Commerce'}},
              'head': {'sha': 'b' * 40, 'repo': {'full_name': 'caraseli02/agent-Commerce'}}}
        def output(args, **kwargs):
            if args[:3] == ['git', 'remote', 'get-url']: return 'https://github.com/caraseli02/agent-Commerce.git'
            if args[:2] == ['git', 'rev-parse']: return self.merge
            if args[:2] == ['git', 'status']: return ''
            return json.dumps(pr)
        with patch('install.subprocess.run') as run, patch('install.subprocess.check_output', side_effect=output):
            self.assertEqual(install.release_identity(self.source, self.merge, 900), self.identity)
            self.assertIn(['git', 'merge-base', '--is-ancestor', self.merge, 'origin/main'], [c.args[0] for c in run.call_args_list])
            for field, value in [('merged_at', None), ('merged_by', {'login': 'automation[bot]'}), ('merge_commit_sha', 'c' * 40), ('body', 'Closes #683'), ('number', 901)]:
                old = pr[field]; pr[field] = value
                with self.assertRaises(ValueError): install.release_identity(self.source, self.merge, 900)
                pr[field] = old
            pr['base']['repo']['full_name'] = 'other/repository'
            with self.assertRaises(ValueError): install.release_identity(self.source, self.merge, 900)
        with patch('install.subprocess.check_output', return_value='wrong-head'):
            with self.assertRaises(ValueError): install.release_identity(self.source, self.merge, 900)


class RegisteredInstallerTests(unittest.TestCase):
    def test_real_work_lease_registered_ancestry_and_permanent_inode(self):
        with tempfile.TemporaryDirectory() as folder:
            host = pathlib.Path(folder).resolve()
            (host / 'settings.json').write_text(json.dumps({'builder_enabled': True, 'reviewer_enabled': True,
                'native_execution_ready': True, 'node_bin': '/usr/bin', 'pg_bin': '/usr/bin'}))
            owner = native_lease.acquire(host, 'fixture-installer', 'work')
            keeper = native_lease.KEEPERS[owner['pid']]
            inode = (host / 'native/builder.lock').stat().st_ino
            try:
                # Merely holding the token outside a registered command is insufficient.
                with self.assertRaises(ValueError): install.lease_snapshot(host, owner['token'], 'fixture-installer')
                module_path = str(pathlib.Path(install.__file__).parent)
                code = ('import sys,pathlib,json; sys.path.insert(0,' + repr(module_path) + '); import install; '
                        'print(json.dumps(install.lease_snapshot(pathlib.Path(sys.argv[1]),sys.argv[2],sys.argv[3])))')
                result = native_lease.request(owner, 'run', args=[os.sys.executable, '-c', code, str(host), owner['token'], 'fixture-installer'], cwd=str(host), timeout=10)
                self.assertEqual(result['exit_code'], 0, pathlib.Path(result['log']).read_text())
                saved = json.loads(pathlib.Path(result['log']).read_text())
                self.assertEqual(saved['lock_inode'], inode)
                for thread in ('other-chat', ''):
                    with self.assertRaises(ValueError): install.lease_snapshot(host, owner['token'], thread)
                with patch('native_lease.inspect', return_value={'state': 'held', 'active_commands': 2, 'commands': [{}, {}]}):
                    with self.assertRaises(ValueError): install.lease_snapshot(host, owner['token'], 'fixture-installer')
            finally:
                native_lease.request(owner, 'release'); keeper.wait(timeout=10)
                pathlib.Path(owner['socket']).unlink(missing_ok=True)
            self.assertEqual((host / 'native/builder.lock').stat().st_ino, inode)


if __name__ == '__main__': unittest.main()
