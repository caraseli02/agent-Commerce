#!/usr/bin/python3
"""A process-held lease for native app-chat work; never runs an AI executor.

The keeper survives separate tool calls. Commands inherit its lock descriptor,
so a killed keeper cannot admit overlap while a command is still alive.
No age expiry, PID-based takeover, or lock-inode deletion is supported.
"""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
import pathlib
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import uuid

ROOT = pathlib.Path(__file__).resolve().parent
KEEPERS = {}  # retain/reap children when this helper is imported in one process


def paths(root):
    folder = root / 'native'
    folder.mkdir(parents=True, exist_ok=True)
    return folder / 'builder.lock', folder / 'owner.json'


def request(owner, action, **data):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
        client.settimeout(7500)
        client.connect(owner['socket'])
        client.sendall((json.dumps(dict(data, token=owner['token'], action=action)) + '\n').encode())
        with client.makefile('rb') as stream:
            response = json.loads(stream.readline())
    if response.get('error'):
        raise RuntimeError(response['error'])
    if response.get('released') and owner['pid'] in KEEPERS:
        KEEPERS.pop(owner['pid']).wait(timeout=5)
    return response


def load_owner(root, token=None):
    owner = json.loads(paths(root)[1].read_text())
    if token is not None and token != owner['token']:
        raise RuntimeError('Lease token does not match the current owner')
    return owner


def acquire(root, thread, purpose='work', resume=False, generation=None):
    if purpose in ('work', 'review'):
        settings = json.loads((root / 'settings.json').read_text())
        enabled = 'builder_enabled' if purpose == 'work' else 'reviewer_enabled'
        if not settings.get(enabled) or not settings.get('native_execution_ready'):
            raise RuntimeError(purpose.capitalize() + ' rollout remains gated; setup smoke checks are allowed')
    process = subprocess.Popen([sys.executable, __file__, '--root', str(root),
        '_hold', '--thread', thread, '--purpose', purpose], stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL, text=True, start_new_session=True)
    value = json.loads(process.stdout.readline())
    process.stdout.close()
    if value.get('busy'):
        process.wait(timeout=5)
        if resume:
            owner = load_owner(root)
            if owner['thread'] != thread or owner['purpose'] != purpose:
                raise RuntimeError('Only the original chat may resume this lease')
            observed = inspect(root)
            if observed.get('state') != 'held' or observed.get('generation') != owner.get('generation'):
                raise RuntimeError('Keeper ownership could not be proven; preserve exclusion')
            if not generation or generation != owner.get('generation'):
                raise RuntimeError('Resume requires the expected original generation')
            status = request(owner, 'status')
            if status['active_commands']:
                raise RuntimeError('An earlier command still runs; wait for it before resuming source work')
            return dict(owner, resumed=True)
        return value
    if value.get('error') or 'pid' not in value:
        process.wait(timeout=5)
        raise RuntimeError(value.get('error', 'Keeper failed to initialize'))
    KEEPERS[value['pid']] = process
    return value


def hold(root, thread, purpose):
    lock_path, owner_path = paths(root)
    lock_handle = open(lock_path, 'a+')
    try:
        fcntl.flock(lock_handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print(json.dumps({'busy': True}), flush=True)
        return
    token = uuid.uuid4().hex
    generation = uuid.uuid4().hex
    # macOS Unix socket paths have a short length limit. Each generation has
    # its own path, so an old client/release cannot affect a successor.
    tag = hashlib.sha256((str(root.resolve()) + generation).encode()).hexdigest()[:16]
    socket_path = str(pathlib.Path(tempfile.gettempdir()) / ('ac-native-' + tag + '.sock'))
    owner = {'thread': thread, 'purpose': purpose, 'token': token, 'socket': socket_path,
             'pid': os.getpid(), 'started': time.time(), 'generation': generation, 'protocol': 2}
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.bind(socket_path)
    os.chmod(socket_path, 0o600)
    server.listen(8)
    server.settimeout(.2)
    owner_path.write_text(json.dumps(owner))
    os.chmod(owner_path, 0o600)
    print(json.dumps(owner), flush=True)
    state = {'active': 0, 'stop': False, 'last_result': None, 'commands': {}}
    guard = threading.Lock()

    def client(connection):
        process = None
        registered = False
        completion_proven = False
        try:
            with connection.makefile('rb') as stream:
                data = json.loads(stream.readline(1048576))
            if data.get('action') == 'inspect':
                with guard:
                    result = {'protocol': 2, 'generation': generation, 'thread': thread, 'purpose': purpose,
                              'pid': os.getpid(), 'releasing': state['stop'],
                              'lock_identity': [os.fstat(lock_handle.fileno()).st_dev, os.fstat(lock_handle.fileno()).st_ino],
                              'active_commands': state['active'], 'commands': list(state['commands'].values())}
                connection.sendall((json.dumps(result) + '\n').encode())
                return
            if data.get('token') != token:
                raise RuntimeError('Wrong lease token')
            action = data.get('action')
            with guard:
                if state['stop']:
                    raise RuntimeError('Lease is releasing')
                if action == 'status':
                    result = {'active_commands': state['active'], 'last_result': state['last_result']}
                elif action == 'release':
                    if state['active']:
                        raise RuntimeError('Cannot release while a registered command is running')
                    state['stop'] = True
                    result = {'released': True}
                elif action == 'run':
                    if state['active']:
                        raise RuntimeError('A registered command is already running; wait for it')
                    args = data.get('args')
                    if not isinstance(args, list) or not args or not all(isinstance(a, str) for a in args):
                        raise RuntimeError('Command must be an argument list, not shell text')
                    # This is a deterministic shell-command helper. AI workers
                    # cannot be smuggled back into the native execution path.
                    if pathlib.Path(args[0]).name in ('codex', 'claude'):
                        raise RuntimeError('Do not launch an AI executor from the native lease')
                    state['active'] += 1
                    registered = True
                    command_id = uuid.uuid4().hex
                    state['commands'][command_id] = {'id': command_id, 'pid': None, 'state': 'starting'}
                    result = None
                else:
                    raise RuntimeError('Unknown lease action')
            if action == 'run':
                env = os.environ.copy()  # existing user-approved GitHub login
                settings_path = root / 'settings.json'
                if settings_path.exists():
                    settings = json.loads(settings_path.read_text())
                    env['PATH'] = settings['node_bin'] + ':' + settings['pg_bin'] + ':/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin'
                logs = root / 'native' / 'commands'
                logs.mkdir(exist_ok=True)
                log_path = logs / (uuid.uuid4().hex + '.log')
                with open(log_path, 'w') as log:
                    os.chmod(log_path, 0o600)
                    result_path = logs / (command_id + '.result.json')
                    process = subprocess.Popen([sys.executable, __file__, '--root', str(root), '_command',
                        '--lock-fd', str(lock_handle.fileno()), '--result', str(result_path),
                        '--timeout', str(min(int(data.get('timeout', 7200)), 7200)), '--', *args],
                        cwd=data.get('cwd'), env=env, stdout=log, stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL, pass_fds=(lock_handle.fileno(),), start_new_session=True)
                    with guard:
                        state['commands'][command_id].update(pid=process.pid, state='running')
                    process.wait()
                    if not result_path.exists():
                        raise RuntimeError('Command guardian ended without a completion record')
                    completion = json.loads(result_path.read_text())
                    code = completion['exit_code']
                    completion_proven = True
                    if completion.get('error'):
                        raise RuntimeError(completion['error'])
                result = {'exit_code': code, 'log': str(log_path)}
                with guard:
                    state['last_result'] = result
                    state['active'] -= 1
                    registered = False
                    state['commands'].pop(command_id, None)
            connection.sendall((json.dumps(result) + '\n').encode())
        except Exception as error:
            with contextlib.suppress(OSError):
                connection.sendall((json.dumps({'error': str(error)}) + '\n').encode())
        finally:
            if registered:
                with guard:
                    if process is not None and not completion_proven:
                        # Lost guardian/completion is unknown, never permission to overlap.
                        state['commands'][command_id]['state'] = 'completion_unknown'
                    else:
                        state['active'] -= 1
                        state['commands'].pop(command_id, None)
            connection.close()

    try:
        while True:
            with guard:
                if state['stop'] and not state['active']:
                    break
            try:
                connection, _ = server.accept()
            except socket.timeout:
                continue
            threading.Thread(target=client, args=(connection,), daemon=False).start()
    finally:
        server.close()
        with contextlib.suppress(FileNotFoundError):
            os.unlink(socket_path)
        # Closing releases this process's descriptor only. Never unlink the
        # permanent lock inode; an inherited command may still own it.
        lock_handle.close()


def lock_state(root):
    """Probe the permanent inode; never remove it or infer from owner metadata."""
    with open(paths(root)[0], 'a+') as handle:
        identity = [os.fstat(handle.fileno()).st_dev, os.fstat(handle.fileno()).st_ino]
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return True, identity
        fcntl.flock(handle, fcntl.LOCK_UN)
        return False, identity


def inspect(root):
    """Unauthenticated sanitized inspection; never use or return owner credentials."""
    try:
        held, identity = lock_state(root)
    except OSError:
        return {'protocol': 2, 'state': 'unknown'}
    if not held:
        return {'protocol': 2, 'state': 'free'}
    unknown = {'protocol': 2, 'state': 'unknown', 'lock_held': True}
    try:
        owner = load_owner(root)
        generation = owner.get('generation')
        if owner.get('protocol') != 2 or not isinstance(generation, str) or len(generation) != 32:
            return unknown
        tag = hashlib.sha256((str(root.resolve()) + generation).encode()).hexdigest()[:16]
        endpoint = str(pathlib.Path(tempfile.gettempdir()) / ('ac-native-' + tag + '.sock'))
        if owner.get('socket') != endpoint:
            return unknown
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
            client.settimeout(2)
            client.connect(endpoint)
            client.sendall(b'{"action":"inspect"}\n')
            with client.makefile('rb') as stream:
                response = json.loads(stream.readline(65536))
        after = load_owner(root)
        still_held, after_identity = lock_state(root)
        if not still_held:
            return {'protocol': 2, 'state': 'free'}
        if (after.get('generation') != generation or identity != after_identity or
                response.get('lock_identity') != identity or response.get('protocol') != 2 or
                any(response.get(k) != owner.get(k) for k in ('generation', 'thread', 'purpose', 'pid')) or
                response.get('releasing') or not isinstance(response.get('active_commands'), int)):
            return unknown
        return {k: response[k] for k in ('protocol', 'generation', 'thread', 'purpose', 'pid', 'active_commands', 'commands')} | {'state': 'held'}
    except (OSError, ValueError, KeyError, TypeError):
        return unknown


def group_alive(pgid):
    # Actual process-group membership, excluding zombies; no PID-age inference.
    listing = subprocess.check_output(['ps', '-axo', 'pgid=,stat='], text=True)
    return any(int(parts[0]) == pgid and not parts[1].startswith('Z')
               for line in listing.splitlines() if len(parts := line.split()) >= 2)


def command_guardian(fd, args, result_path, timeout):
    """Retain the inherited lock after keeper death until the entire command group stops."""
    os.fstat(fd)  # fail before executing if the inherited descriptor is missing
    process = subprocess.Popen(args, pass_fds=(fd,), start_new_session=True)
    deadline = time.monotonic() + timeout
    error = None
    while True:
        code = process.poll()
        try:
            alive = group_alive(process.pid)
        except (OSError, subprocess.SubprocessError, ValueError):
            # Unknown membership must retain the descriptor, including after interruption.
            time.sleep(.1)
            continue
        if code is not None and not alive:
            break
        if time.monotonic() >= deadline:
            # This is the caller's existing bounded-command timeout, never recovery takeover.
            if error is None:
                error = 'Command timed out; owned process group stopped'
                with contextlib.suppress(ProcessLookupError): os.killpg(process.pid, signal.SIGTERM)
                deadline = time.monotonic() + 5
            else:
                with contextlib.suppress(ProcessLookupError): os.killpg(process.pid, signal.SIGKILL)
        time.sleep(.05)
    result_path.write_text(json.dumps({'exit_code': code, 'error': error}))
    os.chmod(result_path, 0o600)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=pathlib.Path, default=ROOT)
    actions = parser.add_subparsers(dest='action', required=True)
    for action in ('acquire', '_hold'):
        p = actions.add_parser(action)
        p.add_argument('--thread', required=True)
        p.add_argument('--purpose', choices=['work', 'review', 'smoke'], default='work')
        if action == 'acquire':
            p.add_argument('--resume', action='store_true')
            p.add_argument('--generation')
    for action in ('status', 'release', 'run'):
        p = actions.add_parser(action)
        p.add_argument('--token', required=True)
        if action == 'run':
            p.add_argument('--cwd', required=True)
            p.add_argument('--timeout', type=int, default=7200)
            p.add_argument('args', nargs=argparse.REMAINDER)
    actions.add_parser('inspect')
    p = actions.add_parser('_command')
    p.add_argument('--lock-fd', type=int, required=True)
    p.add_argument('--result', type=pathlib.Path, required=True)
    p.add_argument('--timeout', type=int, required=True)
    p.add_argument('args', nargs=argparse.REMAINDER)
    a = parser.parse_args()
    try:
        if a.action == 'inspect':
            print(json.dumps(inspect(a.root)))
            return
        if a.action == '_command':
            command_guardian(a.lock_fd, a.args[1:] if a.args[:1] == ['--'] else a.args, a.result, a.timeout)
            return
        if a.action == '_hold':
            hold(a.root, a.thread, a.purpose)
            return
        if a.action == 'acquire':
            result = acquire(a.root, a.thread, a.purpose, a.resume, a.generation)
        else:
            owner = load_owner(a.root, a.token)
            data = {}
            if a.action == 'run':
                args = a.args[1:] if a.args[:1] == ['--'] else a.args
                data = {'args': args, 'cwd': a.cwd, 'timeout': a.timeout}
            result = request(owner, a.action, **data)
        print(json.dumps(result))
    except Exception as error:
        print(json.dumps({'error': str(error)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
