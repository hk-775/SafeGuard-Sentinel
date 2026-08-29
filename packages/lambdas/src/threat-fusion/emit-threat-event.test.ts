import { describe, it, expect, vi } from 'vitest';
import { emitThreatEvent } from './emit-threat-event';
import type { CompositeThreatScoreRecord } from '@safeguard-sentinel/shared';
import { InterventionLevel } from '@safeguard-sentinel/shared';
import type { ThreatEventBridgeClient } from './types';

function makeRecord(compositeScore: number): CompositeThreatScoreRecord {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    compositeScore,
    visualScore: compositeScore,
    textualScore: 0,
    behavioralScore: 0,
    temporalScore: 0,
    weights: { visual: 0.65, textual: 0.65, behavioral: 0.65, temporal: 0.65 },
    degraded: false,
    degradedAnalyzers: [],
    activeInterventionLevel: InterventionLevel.None,
    lastUpdated: '2025-01-15T12:00:00Z',
    ttl: 0,
  };
}

function makeEventBridge(): ThreatEventBridgeClient {
  return { publish: vi.fn().mockResolvedValue(undefined) };
}

describe('emitThreatEvent', () => {
  it('emits event when score >= 60', async () => {
    const eb = makeEventBridge();
    const result = await emitThreatEvent(makeRecord(60), eb);
    expect(result).toBe(true);
    expect(eb.publish).toHaveBeenCalledTimes(1);
    expect(eb.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'safeguard-sentinel.threat-fusion',
        detailType: 'threat.detected',
      }),
    );
  });

  it('emits event when score is 100', async () => {
    const eb = makeEventBridge();
    const result = await emitThreatEvent(makeRecord(100), eb);
    expect(result).toBe(true);
    expect(eb.publish).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit event when score < 60', async () => {
    const eb = makeEventBridge();
    const result = await emitThreatEvent(makeRecord(59.99), eb);
    expect(result).toBe(false);
    expect(eb.publish).not.toHaveBeenCalled();
  });

  it('does NOT emit event when score is 0', async () => {
    const eb = makeEventBridge();
    const result = await emitThreatEvent(makeRecord(0), eb);
    expect(result).toBe(false);
    expect(eb.publish).not.toHaveBeenCalled();
  });

  it('includes session details in the emitted event', async () => {
    const eb = makeEventBridge();
    await emitThreatEvent(makeRecord(75), eb);
    const call = (eb.publish as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.detail).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        userId: 'user-1',
        compositeScore: 75,
      }),
    );
  });
});
