"""Reviewed #830 release and digest-bound migration; never install a helper or history."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import subprocess
import tempfile
import time
import uuid

FILES = ('install.py', 'admission.py', 'native_lease.py', 'recovery.py', 'router.py', 'discover.py', 'scope_check.py', 'runtime.py', 'lease_guard.py', 'config.json', 'dispatcher-workflow.md', 'native-workflow.md', 'investigation-workflow.md', 'automation-prompt.md', 'migration-profile.json', 'migration-policy.md', 'migration-runbook.md', 'scripts/owner-attention.mjs', 'scripts/check-pr-template.mjs', 'scripts/ui-evidence.mjs', '.factory/factory.yaml')
WRITE_SET = ('settings.json', 'dispatcher-workflow.md', 'native-workflow.md', 'investigation-workflow.md')
DEFAULT_HOST = pathlib.Path('/Users/work/.local/share/agent-commerce/autonomy')


def encoded(value):
    return (json.dumps(value, sort_keys=True, indent=2) + '\n').encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def content(path):
    if path.is_symlink() or (path.exists() and not path.is_file()):
        raise ValueError('Installation inputs must be regular files: ' + str(path))
    if path.exists() and path.stat().st_size > 2 * 1024 * 1024:
        raise ValueError('Installation input exceeds reviewed bound: ' + str(path))
    return path.read_bytes() if path.exists() else None


def source_bytes(source):
    return {n: content((source.parent if '/' in n else source) / n) for n in FILES}


def manifest(source):
    data = source_bytes(source)
    if any(v is None for v in data.values()):
        raise ValueError('Incomplete reviewed source')
    return {n: digest(v) for n, v in data.items()}


def migrate_registry(registry):
    """Validation only: installation never rewrites live history."""
    if registry.get('version') != 1 or not isinstance(registry.get('issues'), dict):
        raise ValueError('Unknown registry schema; preserve for review')
    return json.loads(json.dumps(registry))


def outside_host(destination, host):
    if destination.resolve().is_relative_to(host.resolve()):
        raise ValueError('Stage/plan output must be outside installed host')


def stage(source, destination, host=DEFAULT_HOST):
    outside_host(destination, host)
    return stage_release(source, destination)


def stage_release(source, destination):
    hashes = manifest(source)
    data = source_bytes(source)
    destination.mkdir(parents=True, mode=0o700, exist_ok=False)
    for name, value in data.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        target.write_bytes(value); target.chmod(0o600)
    (destination / 'manifest.json').write_bytes(encoded(hashes))
    return hashes


def release_identity(source, merge, pr_number):
    from router import closing_numbers
    if not re.fullmatch(r'[0-9a-f]{40}', merge or '') or not isinstance(pr_number, int) or pr_number <= 0:
        raise ValueError('Exact compatibility merge and PR identity required')
    repo = source.parent
    def output(*args):
        return subprocess.check_output(list(args), cwd=repo, text=True).strip()
    remote = output('git', 'remote', 'get-url', 'origin')
    if remote not in ('git@github.com:caraseli02/agent-Commerce.git', 'https://github.com/caraseli02/agent-Commerce.git', 'https://github.com/caraseli02/agent-Commerce'):
        raise ValueError('Wrong source repository')
    subprocess.run(['git', 'fetch', 'origin', 'main'], cwd=repo, check=True)
    if output('git', 'rev-parse', 'HEAD') != merge or output('git', 'status', '--porcelain', '--untracked-files=all'):
        raise ValueError('Requires clean checkout at exact human merge')
    subprocess.run(['git', 'merge-base', '--is-ancestor', merge, 'origin/main'], cwd=repo, check=True)
    subprocess.run(['git', 'ls-files', '--error-unmatch', *[str((source.parent if '/' in n else source) / n) for n in FILES]], cwd=repo, check=True, stdout=subprocess.DEVNULL)
    pr = json.loads(output('gh', 'api', f'repos/caraseli02/agent-Commerce/pulls/{pr_number}'))
    if (not pr.get('merged_at') or pr.get('merged_by', {}).get('login') != 'caraseli02' or
            pr.get('number') != pr_number or pr.get('merge_commit_sha') != merge or
            pr.get('base', {}).get('repo', {}).get('full_name') != 'caraseli02/agent-Commerce' or
            pr.get('base', {}).get('ref') != 'main' or
            pr.get('head', {}).get('repo', {}).get('full_name') != 'caraseli02/agent-Commerce' or
            830 not in closing_numbers(pr.get('body', ''))):
        raise ValueError('Requires the human-merged corrective PR closing #830 in this repository')
    head = pr.get('head', {}).get('sha')
    if not re.fullmatch(r'[0-9a-f]{40}', head or ''):
        raise ValueError('Unknown reviewed source head')
    subprocess.run(['git', 'merge-base', '--is-ancestor', head, merge], cwd=repo, check=True)
    return {'repo': 'caraseli02/agent-Commerce', 'issue': 830, 'pr': pr_number, 'merge': merge, 'reviewed_head': head}


def lease_snapshot(host, token, thread):
    from native_lease import inspect, load_owner, request
    owner = load_owner(host, token)
    observed = inspect(host)
    status = request(owner, 'status')
    commands = observed.get('commands', [])
    if (owner.get('thread') != thread or owner.get('purpose') != 'work' or owner.get('protocol') != 2 or
            observed.get('state') != 'held' or observed.get('generation') != owner.get('generation') or
            observed.get('thread') != thread or observed.get('purpose') != 'work' or
            observed.get('active_commands') != 1 or status.get('active_commands') != 1 or
            len(commands) != 1 or commands[0].get('state') != 'running'):
        raise ValueError('Own work lease and only the registered installer command required')
    pid = os.getpid()
    for _ in range(32):
        if pid == commands[0].get('pid'):
            break
        if pid <= 1:
            raise ValueError('Installer is not the registered command')
        pid = int(subprocess.check_output(['/bin/ps', '-o', 'ppid=', '-p', str(pid)], text=True).strip())
    else:
        raise ValueError('Unknown registered command ancestry')
    stat = (host / 'native/builder.lock').stat()
    return {'thread': thread, 'generation': owner['generation'], 'protocol': 2,
            'lock_device': stat.st_dev, 'lock_inode': stat.st_ino}


def host_inputs(source, host):
    profile = json.loads((source / 'migration-profile.json').read_text())
    if profile.get('version') != 1 or profile.get('issue') != 830 or profile.get('repo') != 'caraseli02/agent-Commerce':
        raise ValueError('Unknown reviewed policy profile')
    inputs = {}
    for name, expected in profile['policy_sha256'].items():
        value = content(host / name)
        if value is None or digest(value) != expected:
            raise ValueError('Unknown policy/helper bytes; review drift: ' + name)
        inputs[name] = digest(value)
    if inputs['native_lease.py'] != manifest(source)['native_lease.py']:
        raise ValueError('Helper transition requires separate review')
    for name in ('settings.json', 'issue-chats.json', 'investigation-workflow.md'):
        value = content(host / name)
        inputs[name] = None if value is None else digest(value)
    if inputs['investigation-workflow.md'] is not None:
        raise ValueError('Unexpected prior installation; reconcile first')
    settings = json.loads((host / 'settings.json').read_text())
    if (settings.get('lease_protocol') != 2 or settings.get('routing_version') is not None or
            settings.get('recovery_version') is not None or settings.get('watched_recovery_accepted') not in (None, False)):
        raise ValueError('Unknown installed schema/activation state')
    for flag in ('builder_enabled', 'reviewer_enabled', 'native_execution_ready'):
        if not isinstance(settings.get(flag), bool):
            raise ValueError('Unknown activation flag: ' + flag)
    migrate_registry(json.loads((host / 'issue-chats.json').read_text()))
    validate_delivery_history(host)
    # Reviewer journals and delivery ledgers are never frozen or rewritten.
    # They are independently re-read at each message admission.
    return inputs, settings


def validate_delivery_history(host):
    """Validate schemas without freezing append-only records in plan freshness."""
    from admission import generation_name
    raw = content(host / 'native/recovery.json')
    if raw is not None:
        state = json.loads(raw)
        if state.get('version') != 1 or not isinstance(state.get('owners'), dict):
            raise ValueError('Unknown recovery ledger schema')
        for generation, record in state['owners'].items():
            generation_name(generation)
            if not isinstance(record, dict) or record.get('lane_root', str(host)) != str(host):
                raise ValueError('Ambiguous recovery lane history')
    folder = host / 'native/lease-cleanup'
    if folder.is_symlink(): raise ValueError('Ambiguous cleanup ledger directory')
    if folder.exists():
        for path in folder.iterdir():
            if path.suffix != '.json': raise ValueError('Unknown cleanup ledger entry')
            record = json.loads(content(path))
            if (not isinstance(record, dict) or record.get('version') != 1 or
                    record.get('generation') != path.stem or not record.get('thread') or
                    record.get('purpose') not in ('work', 'review') or
                    record.get('lane_root', str(host)) != str(host)):
                raise ValueError('Ambiguous cleanup lane history')
            generation_name(path.stem)


def plan_migration(source, host, merge, pr_number, token, thread):
    host = host.resolve(strict=True)
    identity = release_identity(source, merge, pr_number)
    inputs, settings = host_inputs(source, host)
    lease = lease_snapshot(host, token, thread)
    config = json.loads((source / 'config.json').read_text())
    from router import validate_config
    validate_config(config)
    if config.get('cadence_hours') != 5:
        raise ValueError('Dispatcher cadence must remain five hours')
    release = host / 'releases' / ('compatibility-' + merge)
    if release.exists():
        raise ValueError('Release exists; reconcile journal, never overwrite')
    updated = settings | {'routing_version': 1, 'recovery_version': 1, 'routing_release': str(release),
                          'routing_config': config, 'watched_recovery_accepted': False}
    patch = (source / 'migration-policy.md').read_text()
    rendered = {'settings.json': encoded(updated).decode()}
    for name in WRITE_SET[1:]:
        old = content(host / name)
        base = old.decode() if old is not None else (source / name).read_text()
        rendered[name] = base + '\n\n' + patch
    result = {'version': 1, 'host': str(host), 'identity': identity, 'source': manifest(source),
              'inputs': inputs, 'lease': lease, 'release': str(release), 'rendered': rendered,
              'preserved_settings': settings,
              'preserved': ['native_lease.py', 'native/builder.lock', 'issue-chats.json', 'both delivery ledgers',
                            'independent reviewer lane/history', 'all automation fields'],
              'rollback': 'Only checksummed installation-owned assets; refuse drift, never restore registry/helper/history',
              'approval': 'Separate explicit owner approval of this exact digest required; merge alone does not authorize installation'}
    return result | {'digest': digest(encoded(result))}


def atomic_write(target, data):
    descriptor, name = tempfile.mkstemp(dir=target.parent)
    temporary = pathlib.Path(name)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(data); output.flush(); os.fsync(output.fileno())
        temporary.chmod(0o600); temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


def journal(host, event):
    folder = host / 'native/installations'
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    descriptor = os.open(folder / 'journal.jsonl', os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, 'ab') as output:
        output.write(json.dumps(event, sort_keys=True).encode() + b'\n'); output.flush(); os.fsync(output.fileno())


def verify_plan(plan):
    unsigned = {k: v for k, v in plan.items() if k != 'digest'}
    if plan.get('version') != 1 or digest(encoded(unsigned)) != plan.get('digest'):
        raise ValueError('Corrupt migration plan')


def rollback_assets(host, backup, after):
    saved = json.loads((backup / 'backup.json').read_text())
    if set(saved['files']) != set(WRITE_SET) or set(after) != set(WRITE_SET):
        raise ValueError('Unknown rollback write set')
    originals = {}
    for name, expected in saved['files'].items():
        current = content(host / name)
        if (None if current is None else digest(current)) != after[name]:
            raise ValueError('Rollback refused newer installed asset: ' + name)
        old = content(backup / name)
        if (None if old is None else digest(old)) != expected:
            raise ValueError('Corrupt backup: ' + name)
        originals[name] = old
    for name, old in originals.items():
        if old is None: (host / name).unlink(missing_ok=True)
        else: atomic_write(host / name, old)


def install_merged(source, host, merge, pr_number, approved_plan=None, approval=None, token=None, thread=None):
    if not approved_plan or approval != approved_plan.get('digest'):
        raise ValueError('Concrete owner-approved plan digest required')
    verify_plan(approved_plan)
    fresh = plan_migration(source, host, merge, pr_number, token, thread)
    if fresh != approved_plan:
        raise ValueError('Stale migration inputs; no installed state changed. Replan and obtain approval')
    host = host.resolve()
    backup = host / 'backups' / ('compatibility-' + uuid.uuid4().hex)
    backup.mkdir(mode=0o700, parents=True)
    old = {name: content(host / name) for name in WRITE_SET}
    for name, value in old.items():
        if value is not None: atomic_write(backup / name, value)
    atomic_write(backup / 'backup.json', encoded({'plan': fresh['digest'], 'files': {n: None if v is None else digest(v) for n, v in old.items()}}))
    atomic_write(backup / 'plan.json', encoded(fresh))
    release = pathlib.Path(fresh['release'])
    changed = []
    after = {n: None if v is None else digest(v) for n, v in old.items()}
    try:
        release.parent.mkdir(mode=0o700, exist_ok=True)
        stage_release(source, release)
        staged = {n: digest(content(release / n) or b'') for n in FILES}
        if staged != fresh['source'] or json.loads((release / 'manifest.json').read_text()) != fresh['source'] or manifest(source) != fresh['source']:
            raise ValueError('Source changed during staging')
        inputs, _ = host_inputs(source, host)
        if inputs != fresh['inputs'] or lease_snapshot(host, token, thread) != fresh['lease']:
            raise ValueError('Inputs changed before activation; installed state unchanged')
        journal(host, {'event': 'begin', 'plan': fresh['digest'], 'backup': str(backup), 'time': time.time()})
        for name, value in fresh['rendered'].items():
            data = value.encode(); atomic_write(host / name, data)
            changed.append(name); after[name] = digest(data)
        journal(host, {'event': 'activated', 'plan': fresh['digest'], 'backup': str(backup), 'after': after, 'watched_recovery_accepted': False, 'time': time.time()})
    except Exception as error:
        try:
            if lease_snapshot(host, token, thread) != fresh['lease']:
                raise ValueError('Lease changed; stop before rollback')
            rollback_assets(host, backup, after)
            journal(host, {'event': 'failed_restored', 'plan': fresh['digest'], 'backup': str(backup), 'error': str(error), 'time': time.time()})
        except Exception as rollback_error:
            journal(host, {'event': 'reconciliation_required', 'plan': fresh['digest'], 'backup': str(backup), 'changed': changed, 'error': str(error), 'rollback_error': str(rollback_error), 'time': time.time()})
            raise RuntimeError('Recoverable partial installation; preserve backup/journal for owner review: ' + str(backup)) from rollback_error
        raise
    return {'release': str(release), 'backup': str(backup), 'plan': fresh['digest'], 'automation_updated': False,
            'helper_replaced': False, 'watched_recovery_accepted': False}


def rollback_installation(host, backup, token, thread):
    host = host.resolve(strict=True); backup = backup.resolve(strict=True)
    if backup.parent != (host / 'backups').resolve():
        raise ValueError('Backup must belong to this host installation')
    lease_snapshot(host, token, thread)
    plan = json.loads((backup / 'plan.json').read_text()); verify_plan(plan)
    if plan['host'] != str(host): raise ValueError('Wrong backup host')
    profile = json.loads((pathlib.Path(__file__).parent / 'migration-profile.json').read_text())
    if digest(content(host / 'native_lease.py') or b'') != profile['policy_sha256']['native_lease.py']:
        raise ValueError('Unknown helper; do not roll back across keeper transitions')
    after = {n: digest(v.encode()) for n, v in plan['rendered'].items()}
    rollback_assets(host, backup, after)
    journal(host, {'event': 'rolled_back', 'plan': plan['digest'], 'backup': str(backup), 'time': time.time()})
    return {'rolled_back': True, 'history_preserved': True, 'helper_replaced': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--stage', type=pathlib.Path)
    mode.add_argument('--plan', type=pathlib.Path)
    mode.add_argument('--activate', type=pathlib.Path, metavar='APPROVED_PLAN')
    mode.add_argument('--rollback', type=pathlib.Path, metavar='BACKUP')
    parser.add_argument('--lease-token', required=True)
    parser.add_argument('--thread', required=True)
    parser.add_argument('--host', type=pathlib.Path, default=DEFAULT_HOST)
    parser.add_argument('--merge'); parser.add_argument('--pr', type=int)
    parser.add_argument('--approve-plan')
    args = parser.parse_args()
    source = pathlib.Path(__file__).resolve().parent
    if args.stage:
        lease_snapshot(args.host, args.lease_token, args.thread)
        print(json.dumps(stage(source, args.stage, args.host)))
    elif args.plan:
        outside_host(args.plan, args.host)
        result = plan_migration(source, args.host, args.merge, args.pr, args.lease_token, args.thread)
        descriptor = os.open(args.plan, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'wb') as output: output.write(encoded(result))
        print(json.dumps({'plan': str(args.plan), 'digest': result['digest'], 'activation_authorized': False}))
    elif args.rollback:
        print(json.dumps(rollback_installation(args.host, args.rollback, args.lease_token, args.thread)))
    else:
        approved = json.loads(args.activate.read_text())
        print(json.dumps(install_merged(source, args.host, args.merge, args.pr, approved, args.approve_plan, args.lease_token, args.thread)))
