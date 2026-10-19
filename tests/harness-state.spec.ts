import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { verificationEnvironment } from '../scripts/verification-evidence.mjs';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'harness-state-'));
  roots.push(cwd);
  const env = verificationEnvironment(process.env);
  const write = (file: string, contents: string) => {
    mkdirSync(join(cwd, file, '..'), { recursive: true });
    writeFileSync(join(cwd, file), contents);
  };
  for (const file of ['validate-feature-list.sh', 'check-clean-state.mjs'])
    write(`scripts/${file}`, readFileSync(join(process.cwd(), 'scripts', file), 'utf8'));
  const run = (program: string, ...args: string[]) => spawnSync(program, args, { cwd, env, encoding: 'utf8' });
  const git = (...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  const commit = () => {
    git('add', '.');
    git('commit', '-qm', 'fixture');
  };
  return { cwd, write, run, git, commit };
}

function archive() {
  return {
    schema_version: 2,
    purpose: 'Historical notes only; never current task or completion state.',
    policy: { wip_limit_per_builder: 1, live_claim_authority: 'GitHub issues and PRs' },
    archive: [{ id: 'I660', description: 'Historical issue note', validation: 'Original expected check', evidence: ['Historical proof'] }],
  };
}

describe('historical evidence archive', () => {
  it('accepts historical evidence without inferring live status', () => {
    const r = fixture();
    r.write('feature_list.json', JSON.stringify(archive()));
    const result = r.run('bash', 'scripts/validate-feature-list.sh');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('1 archived evidence note(s)');
  });

  it.each(['active', 'in-progress', 'passing', 'blocked', 'not_started'])('rejects status %s for a historical closed issue', (status) => {
    const r = fixture();
    const data = archive();
    Object.assign(data.archive[0], { status });
    r.write('feature_list.json', JSON.stringify(data));
    const result = r.run('bash', 'scripts/validate-feature-list.sh');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('archive[0].status is not an archive field');
    expect(result.stderr).toContain('Live task status/claims belong only on GitHub');
  });

  it.each(['active_feature_count', 'status_values', 'active_issue', 'assignee', 'claimed'])('rejects duplicate live field %s', (field) => {
    const r = fixture();
    const data = archive();
    Object.assign(data.policy, { [field]: 1 });
    Object.assign(data.archive[0], { [field]: '660' });
    r.write('feature_list.json', JSON.stringify(data));
    const result = r.run('bash', 'scripts/validate-feature-list.sh');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`policy.${field} is not an archive field`);
    expect(result.stderr).toContain(`archive[0].${field} is not an archive field`);
  });

  it('rejects the old task schema instead of silently ignoring active claims', () => {
    const r = fixture();
    r.write(
      'feature_list.json',
      JSON.stringify({ schema_version: 1, policy: { active_feature_count: 1 }, features: [{ status: 'active' }] }),
    );
    const result = r.run('bash', 'scripts/validate-feature-list.sh');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('root.features is not an archive field');
    expect(result.stderr).toContain('schema_version must be 2');
  });

  it.each(['id', 'description', 'validation', 'evidence'])('requires historical context: %s', (field) => {
    const r = fixture();
    const data = archive();
    Reflect.deleteProperty(data.archive[0], field);
    r.write('feature_list.json', JSON.stringify(data));
    const result = r.run('bash', 'scripts/validate-feature-list.sh');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`archive[0].${field}`);
  });

  it('rejects empty proofs, duplicate IDs and malformed JSON', () => {
    const r = fixture();
    const data = archive();
    data.archive[0].evidence = [' '];
    data.archive.push({ ...data.archive[0] });
    r.write('feature_list.json', JSON.stringify(data));
    const result = r.run('bash', 'scripts/validate-feature-list.sh');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('duplicates I660');
    expect(result.stderr).toContain('nonempty proof references');
    r.write('feature_list.json', '{');
    expect(r.run('bash', 'scripts/validate-feature-list.sh').stderr).toContain('cannot read valid JSON');
  });
});

function codeOnlyBranch() {
  const r = fixture();
  r.git('init', '-q', '-b', 'main');
  r.git('config', 'user.email', 'test@example.com');
  r.git('config', 'user.name', 'Test');
  r.git('config', 'core.hooksPath', '/dev/null');
  r.git('config', 'commit.gpgsign', 'false');
  r.write('PROGRESS.md', '# Session note\n\nHistorical context; inspect GitHub for live claims.\n');
  r.write('feature_list.json', JSON.stringify(archive()));
  r.write('app/value.ts', 'export const value = 1;\n');
  r.commit();
  r.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  r.write('app/value.ts', 'export const value = 2;\n');
  r.commit();
  return r;
}

describe('code-only clean handoff', () => {
  it('accepts unchanged notes/archive without live-task headings', () => {
    const r = codeOnlyBranch();
    expect(r.git('diff', '--name-only', 'origin/main..HEAD')).toBe('app/value.ts');
    const result = r.run(process.execPath, 'scripts/check-clean-state.mjs');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('1 changed source file(s) passed');
    expect(r.run('bash', 'scripts/validate-feature-list.sh').status).toBe(0);
    expect(r.git('status', '--porcelain')).toBe('');
  });

  it('still rejects a dirty checkout', () => {
    const r = codeOnlyBranch();
    r.write('app/value.ts', 'export const value = 3;\n');
    const result = r.run(process.execPath, 'scripts/check-clean-state.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('working tree is not clean');
  });

  it('still rejects tracked temporary artifacts', () => {
    const r = codeOnlyBranch();
    r.write('tmp/proof.txt', 'temporary');
    r.commit();
    const result = r.run(process.execPath, 'scripts/check-clean-state.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('tracked temporary/debug artifacts');
  });

  it.each([`${['console', 'log'].join('.')}('accidental debug');`, `// ${['TO', 'DO'].join('')}: unfinished`, '// const abandoned = 1;'])(
    'still rejects added debug patterns: %s',
    (line) => {
      const r = codeOnlyBranch();
      r.write('app/value.ts', `export const value = 2;\n${line}\n`);
      r.commit();
      const result = r.run(process.execPath, 'scripts/check-clean-state.mjs');
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('changed source files introduced debug');
    },
  );
});
