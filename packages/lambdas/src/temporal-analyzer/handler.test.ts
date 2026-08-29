import { describe, it, expect, vi } from 'vitest';
import { evaluateTemporalRisk, computeTemporalRiskScore } from './handler';
import type { TemporalAnalyzerDeps } from './types';
import { EventType, ThreatCategory } from '@safeguard-sentinel/shared';
import type { SignalEvent } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<SignalEvent> = {}): SignalEvent {
  return {
    eventId: 'evt-1',
    eventType: EventType.MessageSent,
    sessionId: 'session-1',
    userId: 'user-1',
    timestamp: '2025-01-15T12:00:00Z',
    geoRegion: 'US',
    deviceFingerprint: 'fp-abc',
    payload: {},
    ...overrides,
  };
}

function makeDeps(overrides: {
  statedTimezone?: string;
  utcOffset?: number;
  connectionTimestamp?: string | null;
  contactRequestTimestamp?: string | null;
  observedUtcOffset?: number;
} = {}): TemporalAnalyzerDeps {
  const tz = overrides.statedTimezone ?? 'UTC';
  const offset = overrides.utcOffset ?? 0;
  return {
    timezoneService: {
      getStatedTimezone: vi.fn().mockResolvedValue(tz),
      getUtcOffset: vi.fn().mockResolvedValue(offset),
    },
    escalationTracker: {
      getConnectionTimestamp: vi.fn().mockResolvedValue(overrides.connectionTimestamp ?? null),
      hasContactRequest: vi.fn().mockResolvedValue(overrides.contactRequestTimestamp != null),
      getContactRequestTimestamp: vi.fn().mockResolvedValue(overrides.contactRequestTimestamp ?? null),
    },
    activityPatternService: {
      getObservedUtcOffset: vi.fn().mockResolvedValue(overrides.observedUtcOffset ?? offset),
    },
    eventBridge: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// computeTemporalRiskScore
// ---------------------------------------------------------------------------

describe('computeTemporalRiskScore', () => {
  it('returns 0 when all analyses are clean', () => {
    const score = computeTemporalRiskScore(
      { isVulnerable: false, localHour: 14, timezone: 'UTC', localTime: '2025-01-15T14:00:00Z' },
      { isRapidEscalation: false, elapsedMinutes: null, thresholdMinutes: 15 },
      { isInconsistent: false, statedOffset: 0, observedOffset: 0, discrepancyHours: 0, thresholdHours: 2 },
    );
    expect(score).toBe(0);
  });

  it('scores vulnerability window at 35 points', () => {
    const score = computeTemporalRiskScore(
      { isVulnerable: true, localHour: 2, timezone: 'UTC', localTime: '2025-01-15T02:00:00Z' },
      { isRapidEscalation: false, elapsedMinutes: null, thresholdMinutes: 15 },
      { isInconsistent: false, statedOffset: 0, observedOffset: 0, discrepancyHours: 0, thresholdHours: 2 },
    );
    expect(score).toBe(35);
  });

  it('scores rapid escalation at 40 points', () => {
    const score = computeTemporalRiskScore(
      { isVulnerable: false, localHour: 14, timezone: 'UTC', localTime: '2025-01-15T14:00:00Z' },
      { isRapidEscalation: true, elapsedMinutes: 5, thresholdMinutes: 15 },
      { isInconsistent: false, statedOffset: 0, observedOffset: 0, discrepancyHours: 0, thresholdHours: 2 },
    );
    expect(score).toBe(40);
  });

  it('scores timezone inconsistency at 25 points', () => {
    const score = computeTemporalRiskScore(
      { isVulnerable: false, localHour: 14, timezone: 'UTC', localTime: '2025-01-15T14:00:00Z' },
      { isRapidEscalation: false, elapsedMinutes: null, thresholdMinutes: 15 },
      { isInconsistent: true, statedOffset: 0, observedOffset: 5, discrepancyHours: 5, thresholdHours: 2 },
    );
    expect(score).toBe(25);
  });

  it('sums all signals to 100 when all detected', () => {
    const score = computeTemporalRiskScore(
      { isVulnerable: true, localHour: 2, timezone: 'UTC', localTime: '2025-01-15T02:00:00Z' },
      { isRapidEscalation: true, elapsedMinutes: 5, thresholdMinutes: 15 },
      { isInconsistent: true, statedOffset: 0, observedOffset: 5, discrepancyHours: 5, thresholdHours: 2 },
    );
    // 35 + 40 + 25 = 100
    expect(score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// evaluateTemporalRisk handler
// ---------------------------------------------------------------------------

describe('evaluateTemporalRisk', () => {
  it('returns an AnalyzerOutputEvent with analyzerId "temporal"', async () => {
    const deps = makeDeps();
    const result = await evaluateTemporalRisk(makeEvent(), deps);

    expect(result.analyzerId).toBe('temporal');
    expect(result.sessionId).toBe('session-1');
    expect(result.userId).toBe('user-1');
  });

  it('publishes temporal.risk.score event to EventBridge', async () => {
    const deps = makeDeps();
    await evaluateTemporalRisk(makeEvent(), deps);

    expect(deps.eventBridge.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'safeguard-sentinel.temporal-analyzer',
        detailType: 'temporal.risk.score',
      }),
    );
  });

  it('returns score 0 and no signals for clean event', async () => {
    const deps = makeDeps();
    const result = await evaluateTemporalRisk(makeEvent(), deps);

    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('includes vulnerability window signal when in window', async () => {
    // Event at 01:00 UTC, user in UTC+0 → local 01:00 AM (vulnerable)
    const deps = makeDeps({ utcOffset: 0 });
    const event = makeEvent({ timestamp: '2025-01-15T01:00:00Z' });

    const result = await evaluateTemporalRisk(event, deps);

    expect(result.score).toBe(35);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.VulnerabilityWindow,
        }),
      ]),
    );
  });

  it('includes rapid escalation signal when detected', async () => {
    const deps = makeDeps({
      connectionTimestamp: '2025-01-15T12:00:00Z',
      contactRequestTimestamp: '2025-01-15T12:05:00Z', // 5 min
    });

    const result = await evaluateTemporalRisk(makeEvent(), deps);

    expect(result.score).toBe(40);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.RapidEscalation,
        }),
      ]),
    );
  });

  it('includes timezone inconsistency signal when detected', async () => {
    const deps = makeDeps({
      utcOffset: 2,
      observedUtcOffset: 8, // discrepancy = 6 > threshold 2
    });

    const result = await evaluateTemporalRisk(makeEvent(), deps);

    expect(result.score).toBe(25);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.TimezoneInconsistency,
        }),
      ]),
    );
  });

  it('includes localTime and timezone in metadata', async () => {
    const deps = makeDeps({ statedTimezone: 'Synthetic/MinusFive', utcOffset: -5 });
    const result = await evaluateTemporalRisk(makeEvent(), deps);

    expect(result.metadata).toEqual(
      expect.objectContaining({
        timezone: 'Synthetic/MinusFive',
      }),
    );
    expect(result.metadata).toHaveProperty('localTime');
  });

  it('combines multiple signals correctly', async () => {
    // Vulnerable window + rapid escalation
    const deps = makeDeps({
      utcOffset: 0,
      connectionTimestamp: '2025-01-15T02:00:00Z',
      contactRequestTimestamp: '2025-01-15T02:05:00Z',
    });
    const event = makeEvent({ timestamp: '2025-01-15T02:00:00Z' });

    const result = await evaluateTemporalRisk(event, deps);

    // 35 (vulnerability) + 40 (escalation) = 75
    expect(result.score).toBe(75);
    expect(result.signals).toHaveLength(2);
  });
});
