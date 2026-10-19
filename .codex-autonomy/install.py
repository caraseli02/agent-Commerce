"""Stage auditable host assets. Activation only from merged source in a watched run."""
import argparse
import datetime
import hashlib
import json
import pathlib
import subprocess
import tempfile

FILES = ('native_lease.py', 'recovery.py', 'router.py', 'discover.py', 'scope_check.py', 'runtime.py', 'lease_guard.py', 'config.json', 'dispatcher-workflow.md', 'native-workflow.md', 'investigation-workflow.md', 'automation-prompt.md', 'scripts/owner-attention.mjs', 'scripts/check-pr-template.mjs', '.factory/factory.yaml')


def migrate_registry(registry):
    result = json.loads(json.dumps(registry))
    if result.get('version') != 1 or not isinstance(result.get('issues'), dict):
        raise ValueError('Unknown registry schema; preserve and request migration review')
    result['routing_version'] = 1
    result['recovery_version'] = 1
    result.setdefault('investigation_evidence', [])
    # Never infer queue admission from historical PASS or clear original claims/history.
    for saved in result['issues'].values():
        saved.setdefault('routing_report', {'state': 'unobserved'})
    return result


def stage(source, destination):
    destination.mkdir(parents=True, exist_ok=False)
    manifest = {}
    for name in FILES:
        data = ((source.parent if '/' in name else source) / name).read_bytes()
        manifest[name] = hashlib.sha256(data).hexdigest()
        (destination / name).parent.mkdir(parents=True, exist_ok=True)
        (destination / name).write_bytes(data)
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


def install_merged(source, host, merge, pr_number):
    repo = source.parent
    subprocess.run(['git', 'fetch', 'origin', 'main'], cwd=repo, check=True)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
    if head != merge or subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo, text=True).strip():
        raise ValueError('Activation requires clean checkout at supplied human merge commit')
    subprocess.run(['git', 'merge-base', '--is-ancestor', merge, 'origin/main'], cwd=repo, check=True)
    config = json.loads((source / 'config.json').read_text())
    pr = json.loads(subprocess.check_output(['gh', 'api', f'repos/{config["repo"]}/pulls/{pr_number}'], text=True))
    from router import closing_numbers
    if not pr.get('merged_at') or pr.get('merge_commit_sha') != merge or 683 not in closing_numbers(pr.get('body', '')):
        raise ValueError('Supplied PR is not the human-merged closing PR for #683')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = host / 'backups' / ('recovery-v1-' + stamp)
    backup.mkdir(parents=True, exist_ok=False)
    names = ('native_lease.py', 'settings.json', 'issue-chats.json', 'dispatcher-workflow.md', 'native-workflow.md', 'investigation-workflow.md')
    old = {n: (host / n).read_bytes() if (host / n).exists() else None for n in names}
    registry = migrate_registry(json.loads(old['issue-chats.json']))
    settings = json.loads(old['settings.json'])
    if settings.get('lease_protocol') not in (None, 2) or settings.get('recovery_version') not in (None, 1):
        raise ValueError('Unknown installed lease/recovery protocol; preserve host and request migration review')
    for name, data in old.items():
        if data is not None: (backup / name).write_bytes(data)
    release = host / 'releases' / ('recovery-' + merge)
    release.parent.mkdir(exist_ok=True)
    stage(source, release)
    settings.update(recovery_version=1, lease_protocol=2, routing_version=1, routing_release=str(release), routing_config=config)
    replacements = {'settings.json': (json.dumps(settings, indent=2) + '\n').encode(), 'issue-chats.json': (json.dumps(registry, indent=2) + '\n').encode()}
    replacements.update({n: (release / n).read_bytes() for n in names if n.endswith('.md')})
    replacements['native_lease.py'] = (release / 'native_lease.py').read_bytes()
    try:
        for name, data in replacements.items():
            target = host / name
            with tempfile.NamedTemporaryFile(dir=host, delete=False) as f:
                f.write(data); temporary = pathlib.Path(f.name)
            temporary.replace(target)
    except Exception:
        for name, data in old.items():
            if data is None: (host / name).unlink(missing_ok=True)
            else: (host / name).write_bytes(data)
        raise
    (backup / 'installation.json').write_text(json.dumps({'merge': merge, 'pr': pr_number, 'release': str(release), 'lease_protocol': 2, 'recovery_version': 1, 'watched_recovery_accepted': False, 'automation': 'unchanged; use native automation_update after watched dry-run'}, indent=2) + '\n')
    return {'release': str(release), 'backup': str(backup), 'automation_updated': False, 'next_action': 'Release the original migration keeper; reacquire protocol 2 before any further command'}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--stage', type=pathlib.Path)
    p.add_argument('--lease-token', required=True)
    p.add_argument('--activate', action='store_true')
    p.add_argument('--host', type=pathlib.Path)
    p.add_argument('--merge')
    p.add_argument('--pr', type=int)
    a = p.parse_args()
    from lease_guard import require_registered_lease
    require_registered_lease(a.lease_token)
    source = pathlib.Path(__file__).resolve().parent
    if a.activate:
        if not a.host or not a.merge or not a.pr or a.stage: p.error('Activation needs host, human merge commit and closing PR identity')
        print(json.dumps(install_merged(source, a.host, a.merge, a.pr)))
    elif a.stage:
        print(json.dumps(stage(source, a.stage)))
    else:
        p.error('Choose staging or explicit post-merge activation')
