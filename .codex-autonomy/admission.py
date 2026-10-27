"""One metadata arbitration boundary for cleanup and recovery, never a work lease."""
import argparse
import contextlib
import fcntl
import json
import os
import pathlib
import re


def generation_name(generation):
    if not isinstance(generation, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', generation):
        raise ValueError('Unknown generation; preserve delivery state')
    return generation


@contextlib.contextmanager
def guard(host):
    host = host.resolve(strict=True)
    folder = host / 'native'
    folder.mkdir(mode=0o700, exist_ok=True)
    with open(folder / 'recovery.lock', 'a+') as lock:
        os.chmod(lock.name, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield host


def existing(host, generation, include_recovery=True):
    """Call under guard. Legacy records implicitly belong to their containing lane."""
    generation_name(generation)
    lane = str(host.resolve(strict=True))
    path = host / 'native/lease-cleanup' / (generation + '.json')
    if path.exists():
        receipt = json.loads(path.read_text())
        if not isinstance(receipt, dict) or receipt.get('generation') != generation or receipt.get('lane_root', lane) != lane:
            raise ValueError('Ambiguous cleanup identity; owner reconciliation required')
        return {'kind': 'cleanup', 'state': receipt.get('state', 'unknown')}
    if include_recovery:
        path = host / 'native/recovery.json'
        if path.exists():
            state = json.loads(path.read_text())
            if state.get('version') != 1 or not isinstance(state.get('owners'), dict):
                raise ValueError('Unknown recovery ledger; owner reconciliation required')
            if generation in state['owners']:
                saved = state['owners'][generation]
                if not isinstance(saved, dict) or saved.get('lane_root', lane) != lane:
                    raise ValueError('Ambiguous recovery identity; owner reconciliation required')
                return {'kind': 'recovery', 'state': saved.get('state', 'unknown'),
                        'fingerprint': saved.get('fingerprint'), 'thread_id': saved.get('thread_id')}
    return None


def reserve_cleanup(host, receipt):
    """Reserve only; native caller must prove stopped ownership before and before send.

    Any existing intent, including resolved or ambiguous delivery, forbids a second
    path. This does not authorize sending, resuming, or continuing an issue.
    """
    generation = generation_name(receipt.get('generation'))
    turn = receipt.get('terminal_turn')
    # Retain existing installed receipt shape; normalized native snapshots are
    # also accepted. Never rewrite a legacy terminal-turn identity or fingerprint.
    terminal = turn if isinstance(turn, dict) else {
        'id': turn, 'status': receipt.get('terminal_turn_status'),
        'completedAt': receipt.get('terminal_turn_completedAt')}
    if (receipt.get('version') != 1 or receipt.get('state') != 'intent_recorded' or
            not receipt.get('thread') or receipt.get('purpose') not in ('work', 'review') or
            not terminal.get('id') or
            terminal.get('status') not in ('completed', 'failed', 'interrupted', 'cancelled') or
            not terminal.get('completedAt')):
        raise ValueError('Cleanup reservation requires original owner and terminal turn identity')
    with guard(host) as canonical:
        if previous := existing(canonical, generation):
            return {'send': False, 'action': 'reconcile', **previous}
        folder = canonical / 'native/lease-cleanup'
        folder.mkdir(mode=0o700, exist_ok=True)
        target = folder / (generation + '.json')
        saved = receipt | {'lane_root': str(canonical)}
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w') as output:
            json.dump(saved, output, indent=2); output.write('\n'); output.flush(); os.fsync(output.fileno())
        return {'send': True, 'action': 'cleanup_reserved', 'receipt': str(target)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Reserve metadata only after fresh native cleanup proof')
    parser.add_argument('--host', type=pathlib.Path, required=True)
    parser.add_argument('--receipt', type=pathlib.Path, required=True)
    args = parser.parse_args()
    print(json.dumps(reserve_cleanup(args.host, json.loads(args.receipt.read_text()))))
