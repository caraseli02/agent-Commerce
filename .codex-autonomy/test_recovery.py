import json
import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

import native_lease as lease
import recovery


class OwnerFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name)
        (self.root / 'settings.json').write_text(json.dumps({'builder_enabled': True, 'native_execution_ready': True, 'node_bin': '/usr/bin', 'pg_bin': '/usr/bin'}))
        self.owner = lease.acquire(self.root, 'original-chat', 'work')
        self.keeper = lease.KEEPERS[self.owner['pid']]
        self.registry = {'issues': {'683': {'thread_id': 'original-chat', 'state': 'implementing'}}}
        self.chat = {'thread_id': 'original-chat', 'status': 'idle_interrupted', 'prior_turn_stopped': True,
                     'interrupted_turn_id': 'turn-1', 'evidence': 'native wait/read turn-1', 'observed_at': time.time()}

    def tearDown(self):
        if self.keeper.poll() is None:
            # Tests own these processes; never use process control in recovery.
            try: lease.request(self.owner, 'release')
            except (RuntimeError, OSError):
                self.keeper.kill()  # fixture-only unknown completion cleanup
        self.keeper.wait(timeout=10)
        pathlib.Path(self.owner['socket']).unlink(missing_ok=True)  # test-owned socket, never permanent lock
        self.temp.cleanup()

    def eventually(self, predicate, seconds=5):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            if predicate(): return
            time.sleep(.025)
        self.fail('Expected process state did not arrive')

    def work_observation(self, root):
        value = lease.inspect(self.root)
        return value

    def test_inspection_busy_and_released_metadata_never_exposes_token(self):
        observed = lease.inspect(self.root)
        self.assertEqual(observed['state'], 'held')
        self.assertEqual(observed['active_commands'], 0)
        self.assertNotIn('token', observed); self.assertNotIn('socket', observed)
        self.assertNotIn(self.owner['token'], json.dumps(observed))
        self.assertTrue(lease.acquire(self.root, 'other', 'work')['busy'])
        lease.request(self.owner, 'release')
        self.eventually(lambda: lease.inspect(self.root)['state'] == 'free')
        self.assertTrue((self.root / 'native/owner.json').exists())
        self.assertEqual(lease.inspect(self.root)['state'], 'free')

    def test_concurrent_contenders_record_only_one_intent(self):
        results = []
        threads = [threading.Thread(target=lambda: results.append(recovery.prepare(self.root, self.registry, self.chat))) for _ in range(3)]
        for thread in threads: thread.start()
        for thread in threads: thread.join(5)
        self.assertEqual(sum(bool(result['send']) for result in results), 1)
        self.assertEqual(len(results), 3)

    def test_lost_guardian_completion_stays_unknown_with_surviving_command(self):
        outcomes = []
        def run():
            try: outcomes.append(lease.request(self.owner, 'run', args=[sys.executable, '-c', "import pathlib,time; pathlib.Path('guardian-child-ready').touch(); time.sleep(.9)"], cwd=str(self.root), timeout=5))
            except RuntimeError: outcomes.append('completion unknown')
        worker = threading.Thread(target=run); worker.start()
        self.eventually(lambda: any(c.get('pid') for c in lease.inspect(self.root).get('commands', [])))
        self.eventually((self.root / 'guardian-child-ready').exists)
        guardian = lease.inspect(self.root)['commands'][0]['pid']
        os.kill(guardian, signal.SIGKILL)  # controlled temporary fixture only
        worker.join(5)
        observed = lease.inspect(self.root)
        self.assertEqual(observed['active_commands'], 1)
        self.assertEqual(observed['commands'][0]['state'], 'completion_unknown')
        with self.assertRaises(RuntimeError): lease.request(self.owner, 'release')
        with self.assertRaises(RuntimeError): lease.acquire(self.root, 'original-chat', 'work', True, self.owner['generation'])
        self.assertFalse(recovery.prepare(self.root, self.registry, self.chat)['send'])
        time.sleep(1)  # fixture child stops naturally; no process displaced

    def test_only_original_owner_expected_generation_resumes(self):
        for thread, generation in [('other', self.owner['generation']), ('original-chat', 'wrong'), ('original-chat', None)]:
            with self.assertRaises(RuntimeError): lease.acquire(self.root, thread, 'work', True, generation)
        result = lease.acquire(self.root, 'original-chat', 'work', True, self.owner['generation'])
        self.assertTrue(result['resumed'])
        with self.assertRaises(RuntimeError): lease.load_owner(self.root, 'wrong-token')

    def test_generation_mismatch_fails_closed_without_changing_lock(self):
        metadata = self.root / 'native/owner.json'
        original = metadata.read_text()
        changed = json.loads(original); changed['generation'] = '0' * 32
        metadata.write_text(json.dumps(changed))
        self.assertEqual(lease.inspect(self.root)['state'], 'unknown')
        self.assertTrue(lease.acquire(self.root, 'other', 'work')['busy'])
        metadata.write_text(original)

    def test_interrupted_requester_cannot_resume_until_its_command_stops(self):
        requester = subprocess.Popen([sys.executable, lease.__file__, '--root', str(self.root),
            'run', '--token', self.owner['token'], '--cwd', str(self.root), '--',
            sys.executable, '-c', 'import time; time.sleep(.6)'], stdout=subprocess.DEVNULL)
        self.eventually(lambda: lease.inspect(self.root).get('active_commands') == 1)
        requester.kill(); requester.wait(timeout=5)  # test-owned interrupted client
        self.assertFalse(recovery.prepare(self.root, self.registry, self.chat)['send'])
        with self.assertRaises(RuntimeError): lease.acquire(self.root, 'original-chat', 'work', True, self.owner['generation'])
        self.eventually(lambda: lease.inspect(self.root).get('active_commands') == 0)
        self.assertTrue(lease.acquire(self.root, 'original-chat', 'work', True, self.owner['generation'])['resumed'])
        self.assertTrue(recovery.prepare(self.root, self.registry, self.chat)['send'])

    def test_running_command_prevents_release_and_resume(self):
        result = []
        worker = threading.Thread(target=lambda: result.append(lease.request(self.owner, 'run', args=[sys.executable, '-c', 'import time; time.sleep(.7)'], cwd=str(self.root), timeout=5)))
        worker.start()
        self.eventually(lambda: lease.inspect(self.root).get('active_commands') == 1)
        observed = lease.inspect(self.root)
        self.assertEqual(len(observed['commands']), 1)
        with self.assertRaises(RuntimeError): lease.request(self.owner, 'release')
        with self.assertRaises(RuntimeError): lease.acquire(self.root, 'original-chat', 'work', True, self.owner['generation'])
        self.assertFalse(recovery.eligible(observed, self.chat, time.time()))
        worker.join(10); self.assertFalse(worker.is_alive())
        self.assertEqual(result[0]['exit_code'], 0)
        self.assertEqual(lease.inspect(self.root)['active_commands'], 0)

    def test_keeper_loss_surviving_descendant_retains_descriptor_exclusion(self):
        ready = self.root / 'ready'
        child = "import pathlib,time; pathlib.Path('ready').touch(); time.sleep(1.2)"
        parent = f"import subprocess,sys,time; subprocess.Popen([sys.executable,'-c',{child!r}], close_fds=True); time.sleep(.25)"
        outcomes = []
        def run():
            try: outcomes.append(lease.request(self.owner, 'run', args=[sys.executable, '-c', parent], cwd=str(self.root), timeout=5))
            except (OSError, ValueError): outcomes.append('keeper stopped')
        worker = threading.Thread(target=run); worker.start()
        self.eventually(ready.exists)
        # Controlled fixture crash; production recovery never kills any process.
        self.keeper.kill(); self.keeper.wait(timeout=5)
        time.sleep(.4)  # direct parent has exited; close_fds child still lives
        self.assertEqual(lease.inspect(self.root)['state'], 'unknown')
        self.assertTrue(lease.acquire(self.root, 'other', 'work')['busy'])
        self.eventually(lambda: lease.inspect(self.root)['state'] == 'free')
        worker.join(5); self.assertFalse(worker.is_alive())
        successor = lease.acquire(self.root, 'other', 'work')
        self.assertNotEqual(successor['generation'], self.owner['generation'])
        with self.assertRaises((RuntimeError, OSError)): lease.request(self.owner, 'release')
        lease.request(successor, 'release')

    def test_interrupted_idle_owner_intent_checkpoint_and_dedup(self):
        with patch('recovery.inspect', side_effect=self.work_observation):
            first = recovery.prepare(self.root, self.registry, self.chat)
            self.assertTrue(first['send'])
            self.assertEqual(first['thread_id'], 'original-chat')
            self.assertEqual(recovery.prepare(self.root, self.registry, self.chat)['action'], 'reconcile')
        key = first['fingerprint']; generation = self.owner['generation']
        for thread, gen, token in [('other', generation, self.owner['token']), ('original-chat', 'wrong', self.owner['token']), ('original-chat', generation, 'wrong')]:
            with self.assertRaises((ValueError, RuntimeError)): recovery.checkpoint(self.root, thread, gen, key, token)
        self.assertTrue(recovery.checkpoint(self.root, 'original-chat', generation, key, self.owner['token'])['checkpointed'])
        with patch('recovery.inspect', side_effect=self.work_observation):
            result = recovery.reconcile(self.root, generation, key, {}, self.chat, self.registry)
            self.assertFalse(result['send']); self.assertEqual(result['state'], 'checkpointed')

    def test_unknown_healthy_stale_unmapped_owners_never_receive_recovery(self):
        with patch('recovery.inspect', side_effect=self.work_observation):
            for change in ({'status': 'running'}, {'status': 'idle_completed'}, {'prior_turn_stopped': False}, {'thread_id': 'other'}, {'observed_at': time.time()-61}):
                self.assertFalse(recovery.prepare(self.root, self.registry, self.chat | change)['send'])
            self.assertFalse(recovery.prepare(self.root, {'issues': {}}, self.chat)['send'])
        with patch('recovery.inspect', return_value={'state': 'unknown', 'lock_held': True}):
            self.assertFalse(recovery.prepare(self.root, self.registry, self.chat)['send'])
        # Legacy keeper is unknown to the new protocol, never silently adopted.
        metadata = self.root / 'native/owner.json'; original = metadata.read_text()
        old = json.loads(original); old.pop('protocol'); metadata.write_text(json.dumps(old))
        self.assertEqual(lease.inspect(self.root)['state'], 'unknown')
        metadata.write_text(original)

    def test_ambiguous_delivery_two_reconciliations_one_blocker_no_resend(self):
        with patch('recovery.inspect', side_effect=self.work_observation):
            first = recovery.prepare(self.root, self.registry, self.chat)
            delivery = {'state': 'unknown', 'thread_id': 'original-chat', 'fingerprint': first['fingerprint'], 'evidence': 'native snapshot ambiguous', 'observed_at': time.time()}
            args = (self.root, self.owner['generation'], first['fingerprint'], delivery, self.chat, self.registry)
            self.assertEqual(recovery.reconcile(*args)['action'], 'wait')
            self.assertEqual(recovery.reconcile(*args)['action'], 'blocker')
            self.assertEqual(recovery.reconcile(*args)['action'], 'wait')
            self.assertFalse(recovery.prepare(self.root, self.registry, self.chat)['send'])

    def test_absence_requires_evidence_and_retries_are_bounded(self):
        with patch('recovery.inspect', side_effect=self.work_observation):
            first = recovery.prepare(self.root, self.registry, self.chat)
            base = (self.root, self.owner['generation'], first['fingerprint'])
            with self.assertRaises(ValueError): recovery.reconcile(*base, {'state': 'absent'}, self.chat, self.registry)
            delivery = {'state': 'absent', 'thread_id': 'original-chat', 'fingerprint': first['fingerprint'], 'evidence': 'native delivery resolved absent', 'observed_at': time.time(), 'absence_proven': True}
            unproven = delivery | {'absence_proven': False}
            self.assertFalse(recovery.reconcile(*base, unproven, self.chat, self.registry)['send'])
            self.assertTrue(recovery.reconcile(*base, delivery, self.chat, self.registry)['send'])
            self.assertFalse(recovery.reconcile(*base, delivery, self.chat, self.registry)['send'])
            self.assertEqual(recovery.reconcile(*base, delivery, self.chat, self.registry)['action'], 'wait')

    def test_recorded_delivery_cannot_be_overruled_by_later_absence(self):
        with patch('recovery.inspect', side_effect=self.work_observation):
            first = recovery.prepare(self.root, self.registry, self.chat)
            base = (self.root, self.owner['generation'], first['fingerprint'])
            delivery = {'state': 'delivered', 'thread_id': 'original-chat', 'fingerprint': first['fingerprint'],
                        'evidence': 'native delivered', 'observed_at': time.time()}
            self.assertFalse(recovery.reconcile(*base, delivery, self.chat, self.registry)['send'])
            absent = delivery | {'state': 'absent', 'absence_proven': True}
            result = recovery.reconcile(*base, absent, self.chat, self.registry)
            self.assertFalse(result['send']); self.assertEqual(result['state'], 'delivered')


if __name__ == '__main__': unittest.main()
