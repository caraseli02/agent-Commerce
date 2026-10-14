"""Busy-owner recovery: sanitized observation, durable intent, original chat only.

No acquisition, token loading, process control, GitHub discovery or messaging here.
Native tools supply fresh compact chat evidence and perform the one scoped send.
"""
import argparse
import contextlib
import fcntl
import json
import pathlib
import tempfile
import time

from native_lease import inspect
from router import fingerprint, handoff


@contextlib.contextmanager
def ledger(host):
    folder = host / 'native'
    folder.mkdir(parents=True, exist_ok=True)
    # Short metadata serialization only. This is not a second execution lease.
    with open(folder / 'recovery.lock', 'a+') as guard:
        fcntl.flock(guard, fcntl.LOCK_EX)
        path = folder / 'recovery.json'
        state = json.loads(path.read_text()) if path.exists() else {'version': 1, 'owners': {}}
        if state.get('version') != 1 or not isinstance(state.get('owners'), dict):
            raise ValueError('Unknown recovery ledger; preserve and request human reconciliation')
        yield state
        with tempfile.NamedTemporaryFile(dir=folder, delete=False, mode='w') as output:
            json.dump(state, output, indent=2); output.write('\n')
            name = pathlib.Path(output.name)
        name.chmod(0o600)
        name.replace(path)


def owner_mapping(registry, observed):
    matches = [(n, entry) for n, entry in registry.get('issues', {}).items()
               if entry.get('thread_id') == observed.get('thread')]
    if len(matches) != 1 or observed.get('purpose') != 'work':
        return None
    n, entry = matches[0]
    if entry.get('state') in ('human_merged', 'closed') or entry.get('blocker'):
        return None
    return n, entry


def eligible(observed, chat, now):
    return (observed.get('state') == 'held' and observed.get('active_commands') == 0 and
            observed.get('commands') == [] and observed.get('generation') and
            chat.get('thread_id') == observed.get('thread') and
            chat.get('status') == 'idle_interrupted' and chat.get('prior_turn_stopped') is True and
            chat.get('interrupted_turn_id') and chat.get('evidence') and
            isinstance(chat.get('observed_at'), (int, float)) and
            0 <= now - chat['observed_at'] <= 60)


def prepare(host, registry, chat, now=None):
    now = time.time() if now is None else now
    observed = inspect(host)
    if observed.get('state') == 'free':
        return {'action': 'normal_acquire', 'send': False}
    if not eligible(observed, chat, now) or not (mapping := owner_mapping(registry, observed)):
        return {'action': 'wait', 'send': False, 'reason': 'Healthy, surviving command, unproven interruption or unknown ownership retains exclusion'}
    issue, entry = mapping
    intent = {'action': 'recover_original_owner', 'issue': int(issue), 'thread_id': observed['thread'],
              'generation': observed['generation'], 'interrupted_turn_id': chat['interrupted_turn_id']}
    key = fingerprint(intent)
    with ledger(host) as state:
        previous = state['owners'].get(observed['generation'])
        if previous:
            return {'action': 'reconcile', 'send': False, 'fingerprint': previous['fingerprint'],
                    'state': previous['state'], 'thread_id': previous['thread_id']}
        decision = handoff(entry, intent, 'idle')
        if not decision.get('send'):
            return {'action': 'wait', **decision}
        saved = {'fingerprint': key, **intent, 'state': 'prepared', 'attempts': 1, 'unresolved': 0,
                 'prepared_at': now, 'chat_evidence': chat['evidence'], 'blocker_reported': False}
        state['owners'][observed['generation']] = saved
    return {**intent, 'action': 'recover', 'send': True, 'fingerprint': key,
            'message': f"Scoped original-owner recovery for issue #{issue}. Lease generation {observed['generation']}; recovery fingerprint {key}. Recheck your prior turn {chat['interrupted_turn_id']} stopped and no registered command survives. Only this original chat may resume with its own token and expected generation, checkpoint this fingerprint, preserve its worktree/PR, continue the same issue safely and release last. Unknown state yields; no takeover or other issue selection."}


def reconcile(host, generation, key, delivery, chat, registry, now=None):
    """Retry only after native evidence proves absence. Ambiguity never resends."""
    now = time.time() if now is None else now
    observed = inspect(host)
    with ledger(host) as state:
        saved = state['owners'].get(generation)
        if not saved or saved['fingerprint'] != key:
            raise ValueError('Recovery generation/fingerprint mismatch')
        if saved['state'] in ('checkpointed', 'resolved', 'blocked'):
            return {'action': 'wait', 'send': False, 'state': saved['state']}
        # A free inode resolves exclusion; never touch old owner metadata or its work.
        if observed.get('state') == 'free':
            saved['state'] = 'resolved'
            return {'action': 'wait', 'send': False, 'state': 'resolved'}
        if observed.get('generation') != generation:
            return {'action': 'wait', 'send': False, 'reason': 'Owner changed or unknown; preserve exclusion'}
        if delivery.get('thread_id') != saved['thread_id'] or delivery.get('fingerprint') != key or not delivery.get('evidence') or not isinstance(delivery.get('observed_at'), (int, float)) or not 0 <= now - delivery['observed_at'] <= 60:
            raise ValueError('Native delivery reconciliation must bind original chat and fingerprint')
        if delivery.get('state') == 'delivered':
            saved['state'] = 'delivered'
        elif delivery.get('state') == 'absent' and delivery.get('absence_proven') is True and eligible(observed, chat, now) and owner_mapping(registry, observed):
            # Verified absent means no previous request arrived; at most one effective request.
            if saved['attempts'] < 2:
                saved.update(state='prepared', attempts=saved['attempts'] + 1)
                return {'action': 'retry_absent', 'send': True, 'thread_id': saved['thread_id'], 'fingerprint': key}
        # Delivered/running owners are healthy; no repeated busy notices or resend.
        if chat.get('thread_id') == saved['thread_id'] and chat.get('status') == 'running':
            return {'action': 'wait', 'send': False, 'state': saved['state']}
        saved['unresolved'] += 1
        if saved['unresolved'] >= 2:
            saved['state'] = 'blocked'
            if not saved['blocker_reported']:
                saved['blocker_reported'] = True
                return {'action': 'blocker', 'send': False, 'thread_id': saved['thread_id'],
                        'reason': 'Original-owner recovery remains unresolved after two reconciliations. Inspect the original chat and surviving commands; preserve lock and unpublished work. No further automatic recovery sends.'}
        return {'action': 'wait', 'send': False, 'state': saved['state']}


def checkpoint(host, thread, generation, key, token):
    # Only the original owner supplies its private token; dispatcher never requests it.
    from native_lease import load_owner, request
    owner = load_owner(host, token)
    if owner.get('thread') != thread or owner.get('generation') != generation:
        raise ValueError('Only the original chat/generation can checkpoint recovery')
    observed = inspect(host)
    if observed.get('state') != 'held' or observed.get('generation') != generation:
        raise ValueError('Unknown or changed keeper; preserve exclusion')
    if request(owner, 'status')['active_commands']:
        raise ValueError('Surviving command prevents recovery checkpoint')
    with ledger(host) as state:
        saved = state['owners'].get(generation)
        if not saved or saved['fingerprint'] != key or saved['thread_id'] != thread:
            raise ValueError('Original recovery intent does not match')
        saved.update(state='checkpointed', checkpointed_at=time.time())
    return {'checkpointed': True, 'generation': generation, 'fingerprint': key}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--host', type=pathlib.Path, required=True)
    commands = p.add_subparsers(dest='action', required=True)
    for name in ('prepare', 'reconcile'):
        sub = commands.add_parser(name)
        sub.add_argument('--registry', type=pathlib.Path, required=True)
        sub.add_argument('--chat', type=pathlib.Path, required=True)
        if name == 'reconcile':
            sub.add_argument('--generation', required=True); sub.add_argument('--fingerprint', required=True)
            sub.add_argument('--delivery', type=pathlib.Path, required=True)
    sub = commands.add_parser('checkpoint')
    for name in ('thread', 'generation', 'fingerprint', 'token'): sub.add_argument('--' + name, required=True)
    a = p.parse_args()
    if a.action == 'checkpoint':
        result = checkpoint(a.host, a.thread, a.generation, a.fingerprint, a.token)
    else:
        registry = json.loads(a.registry.read_text()); chat = json.loads(a.chat.read_text())
        if a.action == 'prepare': result = prepare(a.host, registry, chat)
        else: result = reconcile(a.host, a.generation, a.fingerprint, json.loads(a.delivery.read_text()), chat, registry)
    print(json.dumps(result))
