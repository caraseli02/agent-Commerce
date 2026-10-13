"""Refresh actual worker scope against freshly discovered reservations before publication."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import datetime

from router import overlap


def working_scope(checkout, base):
    patch = subprocess.check_output(['git', '-C', str(checkout), 'diff', '--binary', base])
    paths = subprocess.check_output(['git', '-C', str(checkout), 'diff', '--name-only', base], text=True).splitlines()
    unknown = subprocess.check_output(['git', '-C', str(checkout), 'ls-files', '--others', '--exclude-standard'], text=True).splitlines()
    digest = hashlib.sha256(patch)
    for name in sorted(unknown):
        file = checkout / name
        if file.is_symlink() or not file.is_file():
            raise ValueError('Untracked symlink/non-file scope cannot be assessed')
        digest.update(name.encode() + b'\0' + str(file.stat().st_mode).encode() + b'\0' + hashlib.sha256(file.read_bytes()).digest())
    return {'diff_sha256': digest.hexdigest(), 'paths': paths + unknown, 'untracked': unknown}


def assess(checkout, base, certificate, live, issue):
    age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(live['observed_at'])
    if age.total_seconds() < 0 or age.total_seconds() > 300:
        raise ValueError('Refresh live PR reservations before scope check (five-minute maximum)')
    actual = working_scope(checkout, base)
    paths = actual['paths']
    if actual['untracked'] or certificate.get('diff_sha256') != actual['diff_sha256'] or not set(paths).issubset(set(certificate['paths'])):
        raise ValueError('Actual diff expanded or assessment stale; inspect consumers/contracts and rescope or block')
    conflicts = overlap(certificate, [r for r in live['reservations'] if r.get('issue') != issue])
    if conflicts:
        raise ValueError('; '.join(conflicts))
    return {'scope': 'independent', 'diff_sha256': certificate['diff_sha256'], 'paths': paths, 'head': subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip()}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--checkout', type=pathlib.Path, required=True)
    p.add_argument('--lease-token', required=True)
    p.add_argument('--base', required=True)
    p.add_argument('--certificate', type=pathlib.Path, required=True)
    p.add_argument('--live', type=pathlib.Path, required=True)
    p.add_argument('--issue', type=int, required=True)
    a = p.parse_args()
    from lease_guard import require_registered_lease
    require_registered_lease(a.lease_token)
    print(json.dumps(assess(a.checkout, a.base, json.loads(a.certificate.read_text()), json.loads(a.live.read_text()), a.issue)))
