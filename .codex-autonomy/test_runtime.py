import os
import pathlib
import socket
import subprocess
import sys
import time
import unittest

from runtime import EnvironmentFailure, free_port, listener_pids, owned_server, stop_owned


def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


class OwnedProcessTests(unittest.TestCase):
    def run_server(self, code):
        p = port()
        result = owned_server([sys.executable, '-m', 'http.server', str(p), '--bind', '127.0.0.1'], [sys.executable, '-c', code], p, .1, os.environ, pathlib.Path(__file__).parent)
        self.assertEqual(listener_pids(p), set(), 'Owned listener must be absent after test completion')
        self.assertRaises(ProcessLookupError, os.kill, result['server_pid'], 0)
        return result

    def test_success_explicit_url_identity_cleanup(self):
        result = self.run_server("import os,urllib.request; assert urllib.request.urlopen(os.environ['PLAYWRIGHT_BASE_URL']).status==200")
        self.assertEqual(result['result'], 'confidence')

    def test_test_failure_cleanup(self):
        result = self.run_server('raise SystemExit(9)')
        self.assertEqual(result['test_exit'], 9)

    def test_timeout_cleanup(self):
        p = port()
        with self.assertRaises(EnvironmentFailure):
            owned_server([sys.executable, '-m', 'http.server', str(p), '--bind', '127.0.0.1'], [sys.executable, '-c', 'import time; time.sleep(30)'], p, .01, os.environ, pathlib.Path(__file__).parent)
        self.assertEqual(listener_pids(p), set())

    def test_occupied_port_preserves_original_listener(self):
        p = port()
        original = subprocess.Popen([sys.executable, '-m', 'http.server', str(p), '--bind', '127.0.0.1'], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(100):
                if listener_pids(p) == {original.pid}:
                    break
                time.sleep(.02)
            self.assertEqual(listener_pids(p), {original.pid})
            with self.assertRaises(EnvironmentFailure):
                owned_server(['never-launch'], ['never-test'], p, .1, os.environ, pathlib.Path(__file__).parent)
            self.assertIsNone(original.poll())
            self.assertEqual(listener_pids(p), {original.pid})
        finally:
            stop_owned(original)

    def test_server_failure_is_environment_evidence(self):
        p = port()
        with self.assertRaises(EnvironmentFailure):
            owned_server([sys.executable, '-c', 'raise SystemExit(1)'], ['never-test'], p, .1, os.environ, pathlib.Path(__file__).parent)
        free_port(p)

    def test_exited_leader_does_not_leave_descendant_listener(self):
        p = port()
        code = f"import subprocess,sys,time; subprocess.Popen([sys.executable,'-m','http.server','{p}','--bind','127.0.0.1']); time.sleep(.2)"
        with self.assertRaises(EnvironmentFailure):
            owned_server([sys.executable, '-c', code], [sys.executable, '-c', 'import time;time.sleep(.5)'], p, .1, os.environ, pathlib.Path(__file__).parent)
        self.assertEqual(listener_pids(p), set(), 'Exited leader must not orphan its listener')


if __name__ == '__main__':
    unittest.main()
