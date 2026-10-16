import { assessPrTemplate } from '../check-pr-template.mjs';
import { contextKey, digest } from './store.mjs';

export class Coordinator {
  constructor({ store, github, worker, policy, onError = () => {} }) {
    Object.assign(this, { store, github, worker, policy, onError });
  }
  async recover() {
    // The supervisor must prove no live/orphan VM exists before a retry is admitted.
    if (!(await this.worker.recover())) throw new Error('Worker cleanup is unresolved; dispatch blocked');
    for (const job of this.store.jobs()) {
      if (['preparing', 'running', 'cleaning'].includes(job.state)) {
        this.store.finish(job.id, 'error', 'Coordinator interrupted; supervisor confirmed cleanup. Manual retry required.');
      }
    }
  }
  async discover() {
    const prs = await this.github.prs();
    const numbers = new Set();
    // Only retire absent PRs after a complete successful paginated discovery.
    for (const item of prs) {
      const pr = await this.github.pr(item.number);
      numbers.add(pr.number);
      if (pr.state === 'open') this.store.observe(pr, this.policy);
    }
    this.store.closeAbsent(numbers);
  }
  async request(number) {
    const pr = await this.github.pr(number);
    if (pr.state !== 'open') throw new Error('Manual verification requires an open PR');
    const current = this.store.current(number);
    if (current && ['queued', 'preparing', 'running', 'cleaning'].includes(this.store.get(current.job).state))
      return this.store.get(current.job);
    return this.store.observe(pr, this.policy, true);
  }
  async publish() {
    if (this.publishing) return this.publishing;
    this.publishing = this.publishCurrent();
    try {
      return await this.publishing;
    } finally {
      this.publishing = null;
    }
  }
  async publishCurrent() {
    for (const item of this.store.publications()) {
      if (!this.store.publications().some((p) => p.id === item.id)) continue;
      const job = this.store.get(item.job);
      if (!this.store.isCurrent(job)) {
        // Revoke old-head green, but never replay an old job over a new job on the same SHA.
        const current = this.store.current(job.pr);
        if (!current || this.store.get(current.job).head !== job.head) {
          await this.github.publish({ ...item, state: 'error', description: `Superseded verification ${job.id.slice(0, 8)}` });
        }
        this.store.sent(item.id);
        continue;
      }
      const peers = this.store.currentJobs().filter((j) => j.head === item.head);
      if (peers.every((j) => j.state === 'success')) {
        let stale = false;
        for (const peer of peers) {
          const pr = await this.github.pr(peer.pr);
          const spec = JSON.parse(peer.spec);
          if (
            pr.state !== 'open' ||
            contextKey(pr, this.policy) !== peer.context ||
            digest([pr.body, pr.labels.map((l) => l.name).sort()]) !== spec.metadata
          ) {
            if (pr.state === 'open') this.store.observe(pr, this.policy);
            else this.store.closeAbsent(new Set((await this.github.prs()).map((p) => p.number)));
            stale = true;
          }
        }
        if (stale) continue;
      }
      // One SHA can belong to several PRs/bases. Its summary is green only when
      // every known current association is green; Phase 2 also verifies the evidence context.
      const states = this.store
        .currentJobs()
        .filter((j) => j.head === item.head)
        .map((j) => j.state);
      const state = states.includes('failure')
        ? 'failure'
        : states.includes('error') || states.includes('cleaning')
          ? 'error'
          : states.every((s) => s === 'success')
            ? 'success'
            : 'pending';
      await this.github.publish({ ...item, state });
      this.store.sent(item.id);
    }
  }
  async execute() {
    const job = this.store.take();
    if (!job) return false;
    const spec = JSON.parse(job.spec);
    let result;
    try {
      const pr = await this.github.pr(job.pr);
      if (pr.state !== 'open' || contextKey(pr, this.policy) !== job.context) {
        this.store.finish(job.id, 'superseded', 'Head or base moved before execution');
        if (pr.state === 'open') this.store.observe(pr, this.policy);
        return true;
      }
      const template = assessPrTemplate({ body: pr.body, labels: pr.labels.map((l) => l.name) });
      if (template.status === 'failed') {
        this.store.finish(job.id, 'failure', `PR template: ${template.violations.join('; ')}`);
        return true;
      }
      this.store.finish(job.id, 'running');
      result = this.store.reusable(job) ?? (await this.worker.run({ id: job.id, ...spec }));
      this.store.finish(job.id, 'cleaning');
      if (!result.cleaned) throw new Error('Worker did not prove cleanup');
      if (!['success', 'failure', 'error'].includes(result.state)) throw new Error('Invalid supervisor outcome');
      const latest = await this.github.pr(job.pr);
      const metadata = digest([latest.body, latest.labels.map((l) => l.name).sort()]);
      if (
        !this.store.isCurrent(job) ||
        latest.state !== 'open' ||
        contextKey(latest, this.policy) !== job.context ||
        metadata !== spec.metadata
      ) {
        this.store.finish(job.id, 'superseded', 'Head, base or metadata changed during verification');
        if (latest.state === 'open') this.store.observe(latest, this.policy);
      } else this.store.finish(job.id, result.state, JSON.stringify(result));
    } catch (error) {
      // Cleanup is independently requested even after transport loss or an exception.
      let cleaned = false;
      try {
        cleaned = await this.worker.recover();
      } catch {
        /* Unknown cleanup remains blocking. */
      }
      if (cleaned) this.store.finish(job.id, 'error', error.message);
      else {
        this.store.finish(job.id, 'cleaning', 'Unresolved cleanup; dispatch blocked');
        this.store.transaction(() => this.store.notice(job, 'error'));
        this.onError(error);
      }
    }
    return true;
  }
}
