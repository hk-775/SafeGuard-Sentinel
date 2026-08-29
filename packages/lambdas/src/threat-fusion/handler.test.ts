import { describe, it, expect, vi } from 'vitest';
import { fuseSignals } from './handler';
import type { ThreatFusionDeps } from './types';
import type { AnalyzerOutputEvent, CompositeThreatScoreRecord } from '@safeguard-sentinel/shared';
import { InterventionLevel } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnalyzerEvent(
  overrides: Partial<AnalyzerOutputEvent> = {},
): AnalyzerOutputEvent {
  return {
    analyzerId: 'visual',
    sessionId: 'session-1',
    userId: 'user-1',
    score: 50,
    confidence: 0.8,
    signals: [],
    metadata: {},
    ...overrides,
  };
}

function makeDeps(overrides: {
  existingRecord?: CompositeThreatScoreRecord | null;
  correlatedAccounts?: string[];
} = {}): ThreatFusionDeps {
  return {
    sessionStateStore: {
      getScoreRecord: vi.fn().mockResolvedValue(overrides.existingRecord ?? null),
      putScoreRecord: vi.fn().mockResolvedValue(undefined),
    },
    neptune: {
      findCorrelatedAccounts: vi.fn().mockResolvedValue(overrides.correlatedAccounts ?? []),
    },
    eventBridge: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// fuseSignals handler
// ---------------------------------------------------------------------------

describe('fuseSignals', () => {
  it('creates a new score record when no existing state', async () => {
    const deps = makeDeps();
    const result = await fuseSignals(makeAnalyzerEvent({ analyzerId: 'visual', score: 80 }), deps);

    expect(result.sessionId).toBe('session-1');
    expect(result.userId).toBe('user-1');
    expect(result.visualScore).toBe(80);
    expect(result.textualScore).toBe(0);
    expect(result.behavioralScore).toBe(0);
    expect(result.temporalScore).toBe(0);
    expect(deps.sessionStateStore.putScoreRecord).toHaveBeenCalledTimes(1);
  });

  it('merges incoming score with existing session state', async () => {
    const existing: CompositeThreatScoreRecord = {
      sessionId: 'session-1',
      userId: 'user-1',
      compositeScore: 30,
      visualScore: 40,
      textualScore: 20,
      behavioralScore: 0,
      temporalScore: 0,
      weights: { visual: 0.65, textual: 0.65, behavioral: 0.65, temporal: 0.65 },
      degraded: false,
      degradedAnalyzers: [],
      activeInterventionLevel: InterventionLevel.None,
      lastUpdated: '2025-01-15T12:00:00Z',
      ttl: 0,
    };
    const deps = makeDeps({ existingRecord: existing });
    const result = await fuseSignals(
      makeAnalyzerEvent({ analyzerId: 'behavioral', score: 70 }),
      deps,
    );

    expect(result.visualScore).toBe(40);
    expect(result.textualScore).toBe(20);
    expect(result.behavioralScore).toBe(70);
    expect(result.temporalScore).toBe(0);
  });

  it('persists the updated record to DynamoDB', async () => {
    const deps = makeDeps();
    await fuseSignals(makeAnalyzerEvent(), deps);

    expect(deps.sessionStateStore.putScoreRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        userId: 'user-1',
      }),
    );
  });

  it('emits threat event when composite >= 60', async () => {
    const deps = makeDeps();
    // visual score 100 with default weight 0.65 → composite = 65
    await fuseSignals(makeAnalyzerEvent({ score: 100 }), deps);

    expect(deps.eventBridge.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'safeguard-sentinel.threat-fusion',
        detailType: 'threat.detected',
      }),
    );
  });

  it('does NOT emit threat event when composite < 60', async () => {
    const deps = makeDeps();
    // visual score 10 with default weight 0.65 → composite = 6.5
    await fuseSignals(makeAnalyzerEvent({ score: 10 }), deps);

    expect(deps.eventBridge.publish).not.toHaveBeenCalled();
  });

  it('queries Neptune when score approaches Level 4', async () => {
    const existing: CompositeThreatScoreRecord = {
      sessionId: 'session-1',
      userId: 'user-1',
      compositeScore: 90,
      visualScore: 100,
      textualScore: 100,
      behavioralScore: 100,
      temporalScore: 0,
      weights: { visual: 0.3, textual: 0.3, behavioral: 0.3, temporal: 0.1 },
      degraded: false,
      degradedAnalyzers: [],
      activeInterventionLevel: InterventionLevel.InteractionRestriction,
      lastUpdated: '2025-01-15T12:00:00Z',
      ttl: 0,
    };
    const deps = makeDeps({
      existingRecord: existing,
      correlatedAccounts: ['acc-2', 'acc-3', 'acc-4'],
    });

    const result = await fuseSignals(
      makeAnalyzerEvent({ analyzerId: 'temporal', score: 100 }),
      deps,
    );

    // 0.3*100 + 0.3*100 + 0.3*100 + 0.1*100 = 100 → Level 4 with 3 accounts
    expect(deps.neptune.findCorrelatedAccounts).toHaveBeenCalledWith('user-1');
    expect(result.activeInterventionLevel).toBe(InterventionLevel.NetworkDisruption);
  });

  it('falls back to Level 3 when score >= 94 but < 3 correlated accounts', async () => {
    const existing: CompositeThreatScoreRecord = {
      sessionId: 'session-1',
      userId: 'user-1',
      compositeScore: 90,
      visualScore: 100,
      textualScore: 100,
      behavioralScore: 100,
      temporalScore: 0,
      weights: { visual: 0.3, textual: 0.3, behavioral: 0.3, temporal: 0.1 },
      degraded: false,
      degradedAnalyzers: [],
      activeInterventionLevel: InterventionLevel.InteractionRestriction,
      lastUpdated: '2025-01-15T12:00:00Z',
      ttl: 0,
    };
    const deps = makeDeps({
      existingRecord: existing,
      correlatedAccounts: ['acc-2'],
    });

    const result = await fuseSignals(
      makeAnalyzerEvent({ analyzerId: 'temporal', score: 100 }),
      deps,
    );

    expect(result.activeInterventionLevel).toBe(InterventionLevel.InteractionRestriction);
  });

  it('sets degraded flag when not all analyzers have reported', async () => {
    const deps = makeDeps();
    const result = await fuseSignals(
      makeAnalyzerEvent({ analyzerId: 'visual', score: 50 }),
      deps,
    );

    // Only visual has reported; textual, behavioral, temporal are degraded
    expect(result.degraded).toBe(true);
    expect(result.degradedAnalyzers).toContain('textual');
    expect(result.degradedAnalyzers).toContain('behavioral');
    expect(result.degradedAnalyzers).toContain('temporal');
  });

  it('sets correct intervention level for Level 1 range', async () => {
    const deps = makeDeps();
    // visual 100 * 0.65 = 65 → Level 1
    const result = await fuseSignals(
      makeAnalyzerEvent({ analyzerId: 'visual', score: 100 }),
      deps,
    );
    expect(result.activeInterventionLevel).toBe(InterventionLevel.SafetyPrompt);
  });

  it('includes TTL in the persisted record', async () => {
    const deps = makeDeps();
    await fuseSignals(makeAnalyzerEvent(), deps);

    const savedRecord = (deps.sessionStateStore.putScoreRecord as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedRecord.ttl).toBeGreaterThan(0);
  });
});
