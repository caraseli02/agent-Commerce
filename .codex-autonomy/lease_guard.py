"""Require the existing native global lease, without acquisition or recovery."""
import json
import pathlib
import subprocess


def require_registered_lease(token):
    helper = pathlib.Path('/Users/work/.local/share/agent-commerce/autonomy/native_lease.py')
    result = json.loads(subprocess.check_output(['/usr/bin/python3', str(helper), 'status', '--token', token], text=True))
    if result.get('active_commands') != 1:
        raise ValueError('Run this command through the current exclusive native_lease.py run')
