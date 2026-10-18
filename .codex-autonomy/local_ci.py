"""Read trusted local CI through an operator-installed immutable client, never PR code."""
import json
import os
import pathlib
import subprocess


def evidence(number):
    client = pathlib.Path('/Library/AgentCommerceCI/bin/evidence')
    try:
        for path in (client, *client.parents):
            info = path.lstat()
            if path.is_symlink() or info.st_uid != 0 or info.st_mode & 0o022:
                raise ValueError('Local CI client path is not root-owned and immutable')
        if not os.access(client, os.X_OK):
            raise ValueError('Local CI client is not executable')
        value = json.loads(subprocess.check_output([str(client), str(number)], text=True, timeout=20))
        if value.get('version') != 1 or value.get('number') != number:
            raise ValueError('Wrong local CI evidence identity')
        return value
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        return {'available': False, 'error': str(error)}
