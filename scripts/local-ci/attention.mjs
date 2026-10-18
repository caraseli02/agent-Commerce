import { marker, protectedFilesTouched, isClaudeBuiltPr, claudeQueueState, closingIssueNumbers } from '../owner-attention.mjs';
import { digest } from './store.mjs';

// Durable intent precedes POST. Only a reply/readback from the authenticated App
// bot counts as delivery. A lost response is reconciled before trying another POST.
export class Attention {
  constructor({ store, github, owner, issue, beforeSend = async () => true }) {
    Object.assign(this, { store, github, owner, issue, beforeSend });
  }
  enqueue(key, number, text, context) {
    const body = `${marker(key)}\n@${this.owner} ${text}`;
    this.store.db.prepare('INSERT OR IGNORE INTO attention(key,pr,body,context) VALUES(?,?,?,?)').run(key, number, body, context);
    this.store.db.prepare("UPDATE attention SET state='pending' WHERE key=? AND state='cancelled'").run(key);
    return key;
  }
  episode(name, active, fingerprint = '') {
    const key = `attention:${name}`;
    const saved = this.store.db.prepare('SELECT value FROM meta WHERE key=?').get(key);
    const old = saved ? JSON.parse(saved.value) : { active: false, epoch: 0 };
    const epoch = old.epoch + (active && (!old.active || old.fingerprint !== fingerprint) ? 1 : 0);
    this.store.db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run(key, JSON.stringify({ active, epoch, fingerprint }));
    return `local-${name}:${epoch}`;
  }
  async observeHealth(health, policy) {
    const key = this.episode(`ci-unhealthy:${policy}`, health.ok !== true);
    const context = `health:${policy}`;
    if (health.ok === true) {
      this.store.db.prepare("UPDATE attention SET state='cancelled' WHERE context=? AND state='pending'").run(context);
      return;
    }
    if (!Number.isSafeInteger(this.issue)) return;
    this.enqueue(key, this.issue, 'Local CI has failed; acceptance is blocked. Inspect coordinator health and logs.', context);
    await this.deliver(new Set([key]), { cancelInactive: false });
  }
  async deliver(active, { cancelInactive = true } = {}) {
    await this.github.token();
    if (!Number.isSafeInteger(this.github.publisherId)) throw new Error('Notification App identity unavailable');
    const errors = [];
    for (const row of this.store.db.prepare("SELECT * FROM attention WHERE state='pending'").all()) {
      if (!active.has(row.key)) {
        if (cancelInactive) this.store.db.prepare("UPDATE attention SET state='cancelled' WHERE key=?").run(row.key);
        continue;
      }
      try {
        if (!(await this.beforeSend(row))) {
          this.store.db.prepare("UPDATE attention SET state='cancelled' WHERE key=?").run(row.key);
          continue;
        }
        const comments = await this.github.list(`/issues/${row.pr}/comments`);
        let receipt = comments.find((c) => c.user?.id === this.github.publisherId && c.body?.startsWith(marker(row.key)));
        receipt ??= await this.github.repo(`/issues/${row.pr}/comments`, { method: 'POST', data: { body: row.body } });
        if (receipt.user?.id !== this.github.publisherId || !receipt.id || !receipt.html_url || !receipt.body?.startsWith(marker(row.key)))
          throw new Error('App notification delivery not confirmed');
        this.store.db.prepare("UPDATE attention SET state='delivered',delivery=? WHERE key=?").run(
          JSON.stringify({
            id: receipt.id,
            url: receipt.html_url,
            publisherId: this.github.publisherId,
            observedAt: new Date().toISOString(),
          }),
          row.key,
        );
      } catch (error) {
        // Keep this intent pending, but do not starve unrelated recipients.
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, errors.map((error) => error.message).join('; '));
  }
  async reconcile({ prs, results, config }) {
    const active = new Set();
    const add = (key, number, text, context = key) => active.add(this.enqueue(key, number, text, context));
    for (const { pr, evidence, readiness } of results) {
      if (readiness.ready) {
        const key = `local-ready:${pr.number}:${digest([pr.head.sha, pr.base.sha, evidence.policy, evidence.metadata])}`;
        add(
          key,
          pr.number,
          `PR #${pr.number} is ready for your review and merge. Independent exact-head PASS and current local CI evidence verified.`,
          evidence.job,
        );
      }
      if (await isClaudeBuiltPr({ get: (p) => this.github.repo(p), paginate: (p) => this.github.list(p) }, pr)) {
        const files = await this.github.list(`/pulls/${pr.number}/files`);
        const touched = protectedFilesTouched(files, config.protectedPaths).filter(
          (f) => f.group === 'payments' || !pr.labels.some((l) => l.name === 'owner-approved-harness'),
        );
        if (touched.length)
          add(
            `local-harness:${pr.number}:${digest(touched)}`,
            pr.number,
            `PR #${pr.number} needs your protected-path decision. Claude payment paths remain excluded; only you can grant the harness exception.`,
          );
      }
    }
    const issues = (await this.github.list('/issues?state=open')).filter((i) => !i.pull_request);
    for (const issue of issues) {
      if (!issue.labels.some((l) => l.name === 'blocked')) {
        this.episode(`blocked:${issue.number}`, false);
        continue;
      }
      const comments = await this.github.list(`/issues/${issue.number}/comments`);
      const blocker = comments.filter((c) => c.user?.type !== 'Bot' && /^\s*##\s*Blocked\b/m.test(c.body ?? '')).at(-1);
      add(
        this.episode(
          `blocked:${issue.number}`,
          true,
          digest([issue.title, issue.body, issue.labels.map((l) => l.name).sort(), blocker?.id ?? null]),
        ),
        issue.number,
        `Issue #${issue.number} is blocked and needs your decision. ${blocker?.html_url ?? issue.html_url}`,
      );
    }
    if (Number.isSafeInteger(this.issue)) {
      const queuedNumbers = new Set(results.filter((r) => r.readiness.ready).flatMap((r) => closingIssueNumbers(r.pr.body)));
      const queue = claudeQueueState(issues, {
        neverClaim: config.neverClaim,
        openIssueNumbers: new Set(issues.map((i) => i.number)),
        claimedNumbers: new Set(prs.flatMap((p) => closingIssueNumbers(p.body))),
        queuedNumbers,
      });
      const queueKey = this.episode('queue', config.mode === 'build' && queue.idle);
      if (config.mode === 'build' && queue.idle)
        add(queueKey, this.issue, 'Claude has no eligible build work. Review the queue and label the next bounded issue when appropriate.');
    }
    await this.deliver(active);
  }
}
