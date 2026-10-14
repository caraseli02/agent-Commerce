import unittest
from unittest.mock import patch

from lease_guard import require_registered_lease


class LeaseGuardTests(unittest.TestCase):
    def test_requires_one_registered_command_without_acquiring_or_recovering(self):
        for active in (0, 2):
            with patch('lease_guard.subprocess.check_output', return_value='{"active_commands": ' + str(active) + '}'):
                with self.assertRaises(ValueError): require_registered_lease('own-token')
        with patch('lease_guard.subprocess.check_output', return_value='{"active_commands": 1}') as command:
            require_registered_lease('own-token')
            self.assertEqual(command.call_args.args[0][-3:], ['status', '--token', 'own-token'])
