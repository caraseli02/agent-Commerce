"""Metadata-only admission tests; no native lease or host process is started."""
import json
import pathlib
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

import admission
import recovery


class CleanupAdmissionTests(unittest.TestCase):
    generation = 'generation-a'

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.host = pathlib.Path(self.temp.name) / 'host'
        self.host.mkdir()
        (self.host / 'native').mkdir()
        self.receipt = {
            'version': 1,
            'thread': 'chat-a',
            'purpose': 'work',
            'generation': self.generation,
            'terminal_turn': {
                'id': 'turn-terminal',
                'status': 'completed',
                'completedAt': 1_800_000_000,
            },
            'state': 'intent_recorded',
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_cleanup_reservation_is_durable_and_deduplicated(self):
        first = admission.reserve_cleanup(self.host, self.receipt)
        second = admission.reserve_cleanup(self.host, self.receipt)
        self.assertTrue(first['send'])
        self.assertFalse(second['send'])
        saved = json.loads((self.host / 'native/lease-cleanup/generation-a.json').read_text())
        self.assertEqual(saved['thread'], 'chat-a')
        self.assertEqual(saved['generation'], 'generation-a')

    def test_recovery_first_reservation_blocks_cleanup(self):
        (self.host / 'native/recovery.json').write_text(json.dumps({
            'version': 1,
            'owners': {self.generation: {
                'generation': self.generation,
                'thread_id': 'chat-a',
                'issue': 830,
                'state': 'prepared',
            }},
        }))
        result = admission.reserve_cleanup(self.host, self.receipt)
        self.assertFalse(result['send'])

    def test_cleanup_first_reservation_blocks_recovery(self):
        admission.reserve_cleanup(self.host, self.receipt)
        observation = {
            'state': 'held', 'active_commands': 0, 'commands': [],
            'generation': self.generation, 'thread': 'chat-a', 'purpose': 'work',
        }
        chat = {
            'thread_id': 'chat-a', 'status': 'idle_interrupted',
            'prior_turn_stopped': True, 'interrupted_turn_id': 'turn-old',
            'evidence': 'fresh native snapshot', 'observed_at': time.time(),
        }
        registry = {'issues': {'830': {'thread_id': 'chat-a', 'state': 'implementing'}}}
        with patch('recovery.inspect', return_value=observation):
            result = recovery.prepare(self.host, registry, chat)
        self.assertFalse(result['send'])

    def test_symlink_alias_shares_canonical_host_admission(self):
        alias = pathlib.Path(self.temp.name) / 'alias'
        alias.symlink_to(self.host, target_is_directory=True)
        self.assertTrue(admission.reserve_cleanup(self.host, self.receipt)['send'])
        self.assertFalse(admission.reserve_cleanup(alias, self.receipt)['send'])

    def test_malformed_recovery_metadata_fails_closed(self):
        (self.host / 'native/recovery.json').write_text('{malformed')
        with self.assertRaises((ValueError, json.JSONDecodeError)):
            admission.reserve_cleanup(self.host, self.receipt)

    def test_ambiguous_prior_delivery_blocks_both_paths_without_history_loss(self):
        admission.reserve_cleanup(self.host, self.receipt)
        target = self.host / 'native/lease-cleanup/generation-a.json'
        saved = json.loads(target.read_text()); saved['state'] = 'send_attempted'
        target.write_text(json.dumps(saved)); before = target.read_bytes()
        self.assertFalse(admission.reserve_cleanup(self.host, self.receipt)['send'])
        self.test_cleanup_first_reservation_blocks_recovery()
        self.assertEqual(target.read_bytes(), before)

    def test_invalid_or_mismatched_receipt_is_rejected(self):
        invalid = [
            self.receipt | {'version': 2},
            self.receipt | {'state': 'sent'},
            self.receipt | {'generation': ''},
            self.receipt | {'terminal_turn': {'id': '', 'status': 'completed', 'completedAt': 1}},
        ]
        for receipt in invalid:
            with self.subTest(receipt=receipt), self.assertRaises(ValueError):
                admission.reserve_cleanup(self.host, receipt)

    def test_same_generation_on_distinct_canonical_hosts_is_independent(self):
        other = pathlib.Path(self.temp.name) / 'other-host'
        (other / 'native').mkdir(parents=True)
        self.assertTrue(admission.reserve_cleanup(self.host, self.receipt)['send'])
        self.assertTrue(admission.reserve_cleanup(other, self.receipt)['send'])

    def test_concurrent_cleanup_contenders_reserve_only_one_intent(self):
        results = []
        barrier = threading.Barrier(5)

        def contend():
            barrier.wait()
            results.append(admission.reserve_cleanup(self.host, self.receipt))

        workers = [threading.Thread(target=contend) for _ in range(5)]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join(5)
        self.assertTrue(all(not worker.is_alive() for worker in workers))
        self.assertEqual(sum(bool(result['send']) for result in results), 1)


if __name__ == '__main__':
    unittest.main()
