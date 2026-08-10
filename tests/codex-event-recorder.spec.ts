import { describe, expect, it } from 'vitest';

import { annotateEventLine } from '../scripts/codex-event-recorder.mjs';

describe('Codex event recorder', () => {
  it('adds an observation timestamp to JSON events without changing diagnostics', () => {
    expect(annotateEventLine('{"type":"turn.started"}', '2026-08-10T13:00:00.000Z')).toBe(
      '{"type":"turn.started","observed_at":"2026-08-10T13:00:00.000Z"}'
    );
    expect(annotateEventLine('transport warning', '2026-08-10T13:00:00.000Z')).toBe('transport warning');
  });

  it('preserves a provider timestamp when one is already present', () => {
    expect(annotateEventLine('{"type":"turn.started","observed_at":"2026-08-10T12:59:00.000Z"}', '2026-08-10T13:00:00.000Z')).toBe(
      '{"type":"turn.started","observed_at":"2026-08-10T12:59:00.000Z"}'
    );
  });
});
