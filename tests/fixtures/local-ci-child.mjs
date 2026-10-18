// Test harness only: the production CLI has no fake-worker/token-provider switch.
import { Store } from '../../scripts/local-ci/store.mjs';
import { GitHub } from '../../scripts/local-ci/github.mjs';
import { Coordinator } from '../../scripts/local-ci/coordinator.mjs';

const store = new Store(process.env.TEST_CI_DB);
const github = new GitHub({
  repository: 'caraseli02/agent-Commerce',
  api: process.env.TEST_CI_API,
  tokenProvider: async () => 'test-only-token',
  publisherId: 7,
});
let mode = 'success';
let recoverable = true;
const worker = {
  async recover() {
    return recoverable;
  },
  async run(spec) {
    process.send({ event: 'worker-started', id: spec.id });
    if (mode === 'wait') await new Promise((resolve) => process.once('release-worker', resolve));
    if (mode === 'crash') process.exit(9);
    return { state: mode === 'wait' ? 'success' : mode, cleaned: recoverable, merge: 'c'.repeat(40) };
  },
};
const coordinator = new Coordinator({ store, github, worker, policy: 'a'.repeat(64) });
process.on('message', async ({ id, action, value }) => {
  if (action === 'release') {
    process.emit('release-worker');
    return;
  }
  try {
    let result;
    if (action === 'mode') {
      mode = value;
      result = true;
    } else if (action === 'cleanup') {
      recoverable = value;
      result = true;
    } else if (action === 'jobs') result = store.jobs();
    else if (action === 'request') result = await coordinator.request(value);
    else if (action === 'stop') {
      store.close();
      process.exit(0);
    } else result = await coordinator[action]();
    process.send({ id, result });
  } catch (error) {
    process.send({ id, error: error.message });
  }
});
process.send({ event: 'ready' });
