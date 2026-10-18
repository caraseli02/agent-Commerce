import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';

export const digest = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
export const contextKey = (pr, policy) => digest([pr.number, pr.head.sha, pr.base.ref, pr.base.sha, policy]);
const terminal = ['success', 'failure', 'error', 'superseded'];

export class Store {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, context TEXT NOT NULL, pr INTEGER NOT NULL,
        head TEXT NOT NULL, base TEXT NOT NULL, spec TEXT NOT NULL, state TEXT NOT NULL,
        created INTEGER NOT NULL, updated INTEGER NOT NULL, detail TEXT NOT NULL DEFAULT '', attempt INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS current(pr INTEGER PRIMARY KEY,context TEXT NOT NULL,job TEXT NOT NULL,metadata TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY,job TEXT NOT NULL,state TEXT NOT NULL,description TEXT NOT NULL,sent INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS attention(key TEXT PRIMARY KEY,pr INTEGER NOT NULL,body TEXT NOT NULL,context TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',delivery TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS single_worker ON jobs((1)) WHERE state IN ('preparing','running','cleaning');`);
    const version = this.db.prepare("SELECT value FROM meta WHERE key='schema'").get();
    if (version && version.value !== '1') throw new Error('Unsupported local CI database schema; stop before downgrade.');
    this.db.prepare("INSERT OR IGNORE INTO meta VALUES('schema','1')").run();
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  get(id) {
    return this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
  }
  jobs() {
    return this.db.prepare('SELECT * FROM jobs ORDER BY created,rowid').all();
  }
  current(pr) {
    return this.db.prepare('SELECT * FROM current WHERE pr=?').get(pr);
  }
  notice(job, state) {
    const description = `${job.id.slice(0, 8)} base:${job.base.slice(0, 10)} policy:${JSON.parse(job.spec).policy.slice(0, 10)} ${state}`;
    this.db.prepare('UPDATE outbox SET sent=1 WHERE job=? AND sent=0').run(job.id);
    this.db
      .prepare('INSERT INTO outbox(job,state,description) VALUES(?,?,?)')
      .run(job.id, state === 'superseded' ? 'error' : terminal.includes(state) ? state : 'pending', description);
  }
  transition(id, state, detail = '') {
    const job = this.get(id);
    if (!job) throw new Error('Unknown job');
    this.db.prepare('UPDATE jobs SET state=?,updated=?,detail=? WHERE id=?').run(state, Date.now(), detail, id);
    this.notice(job, state);
  }
  observe(pr, policy, force = false) {
    return this.transaction(() => {
      const context = contextKey(pr, policy);
      const metadata = digest([pr.body, pr.labels.map((l) => l.name).sort()]);
      const current = this.current(pr.number);
      if (!force && current?.context === context && current.metadata === metadata) return this.get(current.job);
      // Metadata edits get their own attempt so a stale template result cannot stay green.
      if (current) {
        const old = this.get(current.job);
        if (old.state === 'queued') this.transition(old.id, 'superseded', 'PR context changed');
        else this.notice(old, 'pending');
      }
      const attempt = Number(this.db.prepare('SELECT count(*) AS n FROM jobs WHERE context=?').get(context).n) + 1;
      const id = randomUUID();
      const spec = JSON.stringify({
        number: pr.number,
        head: pr.head.sha,
        base: pr.base.sha,
        baseRef: pr.base.ref,
        policy,
        body: pr.body,
        labels: pr.labels.map((l) => l.name),
        metadata,
        fresh: force,
      });
      this.db
        .prepare("INSERT INTO jobs(id,context,pr,head,base,spec,state,created,updated,attempt) VALUES(?,?,?,?,?,?,'queued',?,?,?)")
        .run(id, context, pr.number, pr.head.sha, pr.base.sha, spec, Date.now(), Date.now(), attempt);
      this.db.prepare('INSERT OR REPLACE INTO current VALUES(?,?,?,?)').run(pr.number, context, id, metadata);
      this.notice(this.get(id), 'pending');
      return this.get(id);
    });
  }
  closeAbsent(numbers) {
    this.transaction(() => {
      for (const row of this.db.prepare('SELECT * FROM current').all()) {
        if (numbers.has(row.pr)) continue;
        const job = this.get(row.job);
        if (job.state === 'queued') this.transition(job.id, 'superseded', 'PR closed');
        this.db.prepare('DELETE FROM current WHERE pr=?').run(row.pr);
      }
    });
  }
  take() {
    return this.transaction(() => {
      if (this.jobs().some((j) => ['preparing', 'running', 'cleaning'].includes(j.state))) return null;
      const next = this.db
        .prepare("SELECT j.* FROM jobs j JOIN current c ON c.job=j.id WHERE j.state='queued' ORDER BY j.created,j.rowid LIMIT 1")
        .get();
      if (next) this.transition(next.id, 'preparing');
      return next ? this.get(next.id) : null;
    });
  }
  finish(id, state, detail) {
    this.transaction(() => this.transition(id, state, detail));
  }
  isCurrent(job) {
    return this.current(job.pr)?.job === job.id;
  }
  currentJobs() {
    return this.db.prepare('SELECT j.* FROM current c JOIN jobs j ON j.id=c.job').all();
  }
  reusable(job) {
    const spec = JSON.parse(job.spec);
    if (spec.fresh) return null;
    for (const other of this.jobs().reverse()) {
      if (other.id === job.id || other.head !== job.head || other.base !== job.base || !['success', 'failure'].includes(other.state))
        continue;
      const old = JSON.parse(other.spec);
      if (old.policy !== spec.policy || old.baseRef !== spec.baseRef || other.updated < Date.now() - 30 * 86400_000) continue;
      try {
        const result = JSON.parse(other.detail);
        if (result.cleaned === true && result.merge) return { ...result, reusedFrom: other.id };
      } catch {
        /* Template failures and incomplete evidence are not execution receipts. */
      }
    }
    return null;
  }
  publications() {
    return this.db
      .prepare('SELECT o.*,j.head,j.base,j.pr,j.context FROM outbox o JOIN jobs j ON j.id=o.job WHERE sent=0 ORDER BY o.id')
      .all();
  }
  sent(id) {
    this.db.prepare('UPDATE outbox SET sent=1 WHERE id=?').run(id);
  }
  prune({ days = 30, count = 100 } = {}) {
    const keep = new Set(
      this.db
        .prepare('SELECT job FROM current UNION SELECT job FROM outbox WHERE sent=0')
        .all()
        .map((r) => r.job),
    );
    const jobs = this.jobs()
      .filter((j) => terminal.includes(j.state))
      .reverse();
    const removed = [];
    this.transaction(() => {
      for (const [index, job] of jobs.entries()) {
        if (keep.has(job.id) || (index < count && job.updated > Date.now() - days * 86400_000)) continue;
        this.db.prepare('DELETE FROM outbox WHERE job=?').run(job.id);
        this.db.prepare('DELETE FROM jobs WHERE id=?').run(job.id);
        removed.push(job.id);
      }
    });
    return removed;
  }
  close() {
    this.db.close();
  }
}
