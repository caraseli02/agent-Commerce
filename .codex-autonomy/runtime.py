"""Owned runtime for a bounded investigation, inside the existing test-schema wrapper."""
import argparse
import json
import os
import pathlib
import signal
import socket
import subprocess
import time
import urllib.request


class EnvironmentFailure(RuntimeError):
    pass


def listener_pids(port):
    result = subprocess.run(['/usr/sbin/lsof', '-nP', '-t', f'-iTCP:{port}', '-sTCP:LISTEN'], capture_output=True, text=True)
    if result.returncode not in (0, 1):
        raise EnvironmentFailure('Cannot inspect listener identity')
    return {int(x) for x in result.stdout.split()}


def free_port(port):
    if listener_pids(port):
        raise EnvironmentFailure('Port already occupied; preserving existing listener')
    with socket.socket() as sock:
        try:
            sock.bind(('127.0.0.1', port))
        except OSError as error:
            raise EnvironmentFailure('Port unavailable') from error


def stop_owned(child):
    # The leader may have exited while descendants still hold the owned group.
    try:
        os.killpg(child.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        child.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait(timeout=5)
    # Reap leader, then stop any descendants that outlived it in the owned session.
    deadline = time.monotonic() + 1
    while time.monotonic() < deadline:
        try:
            os.killpg(child.pid, 0)
        except ProcessLookupError:
            return
        time.sleep(.02)
    try:
        os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def owned_server(server_args, test_args, port, minutes, env, cwd, readiness_seconds=60):
    free_port(port)
    base = f'http://127.0.0.1:{port}'
    runtime_env = dict(env, HOST='127.0.0.1', PORT=str(port), NUXT_PUBLIC_MOCK_MODE='true', NUXT_PUBLIC_BASE_URL_API='/api', PLAYWRIGHT_BASE_URL=base, PAYMENTS_PROVIDER='mock', STRIPE_GATE_A_APPROVED='false', STRIPE_SECRET_KEY='', STRIPE_WEBHOOK_SECRET='')
    started = time.monotonic()
    server = subprocess.Popen(server_args, cwd=cwd, env=runtime_env, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    test = None
    try:
        deadline = min(started + minutes * 60, started + readiness_seconds)
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise EnvironmentFailure('Owned server exited before readiness')
            listeners = listener_pids(port)
            if listeners and listeners != {server.pid}:
                raise EnvironmentFailure('Listener belongs to another process; refusing attachment')
            if listeners == {server.pid}:
                try:
                    with urllib.request.urlopen(base, timeout=1) as response:
                        if response.status == 200:
                            break
                except OSError:
                    pass
            time.sleep(.1)
        else:
            raise EnvironmentFailure('Owned server not ready within budget')
        test = subprocess.Popen(test_args, cwd=cwd, env=runtime_env, start_new_session=True)
        try:
            code = test.wait(timeout=max(.1, minutes * 60 - (time.monotonic() - started)))
        except subprocess.TimeoutExpired as error:
            raise EnvironmentFailure('Investigation trial budget exhausted') from error
        if listener_pids(port) != {server.pid}:
            raise EnvironmentFailure('Listener identity changed during investigation')
        return {'result': 'confidence' if code == 0 else 'candidate_failure', 'test_exit': code, 'base_url': base, 'server_pid': server.pid}
    finally:
        if test:
            stop_owned(test)
        stop_owned(server)
        for pid in listener_pids(port):
            try:
                if os.getpgid(pid) == server.pid:
                    raise EnvironmentFailure('Owned descendant listener cleanup failed')
            except ProcessLookupError:
                pass


def validate_checkout(cwd, head):
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=cwd, text=True).strip()
    main = subprocess.check_output(['git', 'rev-parse', 'origin/main'], cwd=cwd, text=True).strip()
    if actual != head or main != head or subprocess.check_output(['git', 'status', '--porcelain'], cwd=cwd, text=True).strip():
        raise EnvironmentFailure('Investigation requires clean separate checkout pinned to recorded main')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--checkout', type=pathlib.Path, required=True)
    p.add_argument('--lease-token', required=True)
    p.add_argument('--head', required=True)
    p.add_argument('--worker-checkout', type=pathlib.Path, required=True)
    p.add_argument('--port', type=int, default=3206)
    p.add_argument('--minutes', type=int, default=40)
    p.add_argument('--isolated', action='store_true', help=argparse.SUPPRESS)
    p.add_argument('test', nargs=argparse.REMAINDER)
    a = p.parse_args()
    from lease_guard import require_registered_lease
    require_registered_lease(a.lease_token)
    cwd = a.checkout.resolve()
    def interrupted(_signum, _frame):
        raise EnvironmentFailure('Investigation interrupted')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    deadline = min(float(os.environ.get('CODEX_INVESTIGATION_DEADLINE', time.monotonic() + a.minutes * 60)), time.monotonic() + a.minutes * 60)
    try:
        if cwd == a.worker_checkout.resolve() or not 1 <= a.minutes <= 45 or not 1024 <= a.port <= 65535:
            raise EnvironmentFailure('Invalid independent checkout or budget/port')
        validate_checkout(cwd, a.head)
        from urllib.parse import urlparse
        connection = urlparse(os.environ.get('DATABASE_URL_UNPOOLED') or os.environ.get('DATABASE_URL', ''))
        if connection.hostname not in ('localhost', '127.0.0.1', '::1'):
            raise EnvironmentFailure('Existing local PostgreSQL prerequisite required; hosted databases forbidden')
        free_port(a.port)
        if not a.test or a.test[0] != '--' or len(a.test) < 2:
            raise EnvironmentFailure('Explicit focused test command required')
        allowed = ['pnpm', 'exec', 'playwright', 'test']
        command_args = a.test[1:]
        if command_args[:len(allowed)] != allowed or len(command_args) <= len(allowed) or command_args[len(allowed)] not in ('--config=playwright.performance.config.ts', '--config=playwright.config.ts'):
            raise EnvironmentFailure('Runtime accepts only locked Playwright E2E/performance configs with external base URL')
        extra = iter(command_args[len(allowed) + 1:])
        for value in extra:
            if value in ('--grep', '--project'):
                argument = next(extra, '')
                if not argument or argument.startswith('-'):
                    raise EnvironmentFailure('Missing focused test filter')
            elif not value.startswith(('tests/e2e/', 'tests/performance/')) or '..' in value.split('/') or not value.endswith('.spec.ts'):
                raise EnvironmentFailure('Unsupported investigation option/path; snapshot mutations forbidden')
        if not a.isolated:
            # Existing DB only, localhost only, isolated random schema via repository wrapper.
            subprocess.run(['pnpm', 'build'], cwd=cwd, check=True, timeout=max(.1, deadline - time.monotonic()))
            command = ['node', 'scripts/with-test-database.mjs', '/usr/bin/python3', str(pathlib.Path(__file__).resolve()), '--lease-token', a.lease_token, '--isolated', '--checkout', str(cwd), '--worker-checkout', str(a.worker_checkout), '--head', a.head, '--port', str(a.port), '--minutes', str(a.minutes), *a.test]
            wrapper_env = dict(os.environ, CODEX_INVESTIGATION_DEADLINE=str(deadline))
            raise SystemExit(subprocess.call(command, cwd=cwd, env=wrapper_env))
        from urllib.parse import parse_qs, urlparse
        if not parse_qs(urlparse(os.environ.get('DATABASE_URL', '')).query).get('options', [''])[0].startswith('-c search_path=ecas_test_'):
            raise EnvironmentFailure('Runtime must be inside existing isolated test-schema wrapper')
        remaining = (deadline - time.monotonic()) / 60
        if remaining <= 0:
            raise EnvironmentFailure('Investigation budget consumed by setup')
        result = owned_server(['node', '.output/server/index.mjs'], a.test[1:], a.port, remaining, os.environ, cwd)
        validate_checkout(cwd, a.head)
        print(json.dumps(dict(result, head=a.head, cleanup='owned processes stopped')))
    except (EnvironmentFailure, OSError, subprocess.SubprocessError) as error:
        print(json.dumps({'result': 'environment_failure', 'reason': str(error), 'findings': []}))
        raise SystemExit(75)


if __name__ == '__main__':
    main()
