import { createPrivateKey, sign } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';
import { trustedPath } from './config.mjs';
import { evidenceApiSignal } from './evidence.mjs';

export class GitHub {
  constructor({
    repository,
    appId,
    installationId,
    privateKeyPath,
    api = 'https://api.github.com',
    tokenProvider,
    publisherId,
    notifications = false,
  }) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
    Object.assign(this, { repository, appId, installationId, privateKeyPath, api, tokenProvider, publisherId, notifications });
  }
  async token() {
    if (this.tokenProvider) return this.tokenProvider();
    if (this.cached && this.cached.expires > Date.now() + 60_000) return this.cached.token;
    if (!this.appId || !this.installationId || !this.privateKeyPath) throw new Error('GitHub App credentials are missing');
    await trustedPath(this.privateKeyPath);
    if ((await lstat(this.privateKeyPath)).mode & 0o007) throw new Error('App private key is world-accessible');
    const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: String(this.appId) })}`;
    const key = createPrivateKey(await readFile(this.privateKeyPath));
    const jwt = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url')}`;
    const app = await this.request('/app', { token: jwt });
    if (String(app.id) !== String(this.appId) || !app.slug) throw new Error('GitHub App identity mismatch');
    const response = await this.request(`/app/installations/${encodeURIComponent(this.installationId)}/access_tokens`, {
      method: 'POST',
      token: jwt,
      data: {
        repositories: [this.repository.split('/')[1]],
        permissions: { contents: 'read', pull_requests: 'read', statuses: 'write', ...(this.notifications ? { issues: 'write' } : {}) },
      },
    });
    const publisher = await this.request(`/users/${encodeURIComponent(`${app.slug}[bot]`)}`, { token: response.token });
    if (publisher.type !== 'Bot' || !Number.isSafeInteger(publisher.id)) throw new Error('GitHub App bot identity unavailable');
    this.publisherId = publisher.id;
    this.cached = { token: response.token, expires: Date.parse(response.expires_at) };
    return this.cached.token;
  }
  async request(path, { method = 'GET', data, token } = {}) {
    const publicSignal = evidenceApiSignal();
    const response = await fetch(`${this.api}${path}`, {
      method,
      signal: publicSignal ? AbortSignal.any([publicSignal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token ?? (await this.token())}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    if (!response.ok) {
      if (response.status === 401) this.cached = null;
      const retry =
        Number(response.headers.get('retry-after')) ||
        Math.max(0, Number(response.headers.get('x-ratelimit-reset')) * 1000 - Date.now()) / 1000;
      const error = new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
      error.status = response.status;
      error.retryMs = Math.min(3600_000, Math.max(60_000, retry * 1000 || 60_000));
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  repo(path, options) {
    return this.request(`/repos/${this.repository}${path}`, options);
  }
  async list(path) {
    const result = [];
    for (let page = 1; ; page++) {
      const rows = await this.repo(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(rows)) throw new Error('Malformed GitHub collection');
      result.push(...rows);
      if (rows.length < 100) return result;
    }
  }
  async published(job) {
    await this.token();
    const statuses = await this.list(`/commits/${job.head}/statuses`);
    const latest = statuses.find((s) => s.context === 'local-ci/verify');
    const spec = JSON.parse(job.spec);
    return (
      latest?.creator?.id === this.publisherId &&
      latest?.state === 'success' &&
      latest?.description === `${job.id.slice(0, 8)} base:${job.base.slice(0, 10)} policy:${spec.policy.slice(0, 10)} success`
    );
  }
  async prs() {
    const result = [];
    for (let page = 1; ; page++) {
      const rows = await this.repo(`/pulls?state=open&per_page=100&page=${page}`);
      if (!Array.isArray(rows)) throw new Error('Malformed PR list');
      result.push(...rows);
      if (rows.length < 100) return result;
    }
  }
  async pr(number) {
    const pr = await this.repo(`/pulls/${number}`);
    // A pull's cached base.sha can lag the current branch tip.
    const ref = await this.repo(`/git/ref/heads/${encodeURIComponent(pr.base.ref)}`);
    return { ...pr, base: { ...pr.base, sha: ref.object.sha } };
  }
  async publish(item) {
    await this.token();
    const statuses = await this.repo(`/commits/${item.head}/statuses?per_page=100`);
    const previous = statuses.find((s) => s.context === 'local-ci/verify');
    if (previous?.creator?.id === this.publisherId && previous?.state === item.state && previous.description === item.description) return;
    await this.repo(`/statuses/${item.head}`, {
      method: 'POST',
      data: { context: 'local-ci/verify', state: item.state, description: item.description.slice(0, 140) },
    });
  }
}
