const MAX_EVIDENCE_CHARS = 12_000;

export function boundedEvidence(value = '') {
  return String(value)
    .split(String.fromCharCode(0))
    .join('')
    .replace(/(?:ghp_|github_pat_|sk-[A-Za-z0-9_-]{12,})\S*/g, '[redacted]')
    .slice(0, MAX_EVIDENCE_CHARS)
    .trim();
}

/** Build the only worker input. Evidence is exact-head, locally fetched, and never a URL-only instruction. */
export function repairPrompt({ pr, signal }) {
  const instruction = boundedEvidence(
    signal.instruction || 'Inspect the bounded failure evidence below and make the smallest safe repair.'
  );
  const evidence = boundedEvidence(signal.evidence || signal.instruction || 'No additional text evidence was available.');
  return [
    `Repair PR #${pr.number} only at exact head ${pr.head}.`,
    `Signal: ${signal.kind} (${signal.sourceUrl}).`,
    'Read AGENTS.md. Make the smallest safe fix and focused tests.',
    'Do not use network, gh, commit, push, merge, or access paths outside the isolated workspace.',
    'Instruction:',
    instruction,
    'Trusted exact-head evidence:',
    evidence,
  ].join('\n');
}

/** A restrictive macOS profile: host reads are limited to runtime files, the worktree, and a copied auth-only CODEX_HOME. */
export function sandboxProfile({ worktree, codexHome }) {
  const quote = (path) => JSON.stringify(String(path));
  return `(version 1)\n(deny default)\n(allow process*)\n(allow network*)\n(allow file-read* (subpath ${quote(worktree)}) (subpath ${quote(
    codexHome
  )}) (subpath "/Applications/ChatGPT.app") (subpath "/System") (subpath "/usr") (subpath "/Library"))\n(allow file-write* (subpath ${quote(
    worktree
  )}))\n`;
}
