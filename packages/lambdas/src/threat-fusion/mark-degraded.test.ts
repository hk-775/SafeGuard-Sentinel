import { describe, it, expect } from 'vitest';
import { markDegraded } from './mark-degraded';
import type { AnalyzerOutputEvent } from '@safeguard-sentinel/shared';
import { SignalSeverity } from '@safeguard-sentinel/shared';

function makeOutput(analyzerId: 'visual' | 'textual' | 'behavioral' | 'temporal', score = 50): AnalyzerOutputEvent {
  return {
    analyzerId,
    sessionId: 'session-1',
    userId: 'user-1',
    score,
    confidence: 0.8,
    signals: [],
    metadata: {},
  };
}

describe('markDegraded', () => {
  it('returns degraded: false when all four analyzers are present', () => {
    const outputs = [
      makeOutput('visual'),
      makeOutput('textual'),
      makeOutput('behavioral'),
      makeOutput('temporal'),
    ];
    const result = markDegraded(outputs);
    expect(result.degraded).toBe(false);
    expect(result.degradedAnalyzers).toEqual([]);
    expect(result.availableScores).toEqual({
      visual: 50,
      textual: 50,
      behavioral: 50,
      temporal: 50,
    });
  });

  it('returns degraded: true when one analyzer is missing', () => {
    const outputs = [
      makeOutput('visual'),
      makeOutput('textual'),
      makeOutput('behavioral'),
    ];
    const result = markDegraded(outputs);
    expect(result.degraded).toBe(true);
    expect(result.degradedAnalyzers).toEqual(['temporal']);
    expect(result.availableScores).toEqual({
      visual: 50,
      textual: 50,
      behavioral: 50,
    });
  });

  it('returns degraded: true with multiple missing analyzers', () => {
    const outputs = [makeOutput('visual')];
    const result = markDegraded(outputs);
    expect(result.degraded).toBe(true);
    expect(result.degradedAnalyzers).toEqual(['textual', 'behavioral', 'temporal']);
    expect(result.availableScores).toEqual({ visual: 50 });
  });

  it('handles empty outputs — all analyzers degraded', () => {
    const result = markDegraded([]);
    expect(result.degraded).toBe(true);
    expect(result.degradedAnalyzers).toEqual(['visual', 'textual', 'behavioral', 'temporal']);
    expect(result.availableScores).toEqual({});
  });

  it('preserves individual scores from outputs', () => {
    const outputs = [
      makeOutput('visual', 80),
      makeOutput('behavioral', 30),
    ];
    const result = markDegraded(outputs);
    expect(result.availableScores.visual).toBe(80);
    expect(result.availableScores.behavioral).toBe(30);
  });
});
