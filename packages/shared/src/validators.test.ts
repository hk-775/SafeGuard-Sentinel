import { describe, it, expect } from 'vitest';
import {
  validateScore,
  validateConfidence,
  computeTTL,
  computeContentTTL,
  computeAuditTTL,
  validateSignalEvent,
  validateCompositeThreatScoreRecord,
} from './validators';
import { CONTENT_RETENTION_DAYS, AUDIT_RETENTION_MONTHS } from './constants';
import { EventType, InterventionLevel } from './enums';

describe('validateScore', () => {
  it('accepts 0', () => expect(validateScore(0)).toBe(true));
  it('accepts 100', () => expect(validateScore(100)).toBe(true));
  it('accepts 50', () => expect(validateScore(50)).toBe(true));
  it('rejects -1', () => expect(validateScore(-1)).toBe(false));
  it('rejects 101', () => expect(validateScore(101)).toBe(false));
  it('rejects NaN', () => expect(validateScore(NaN)).toBe(false));
});

describe('validateConfidence', () => {
  it('accepts 0', () => expect(validateConfidence(0)).toBe(true));
  it('accepts 1', () => expect(validateConfidence(1)).toBe(true));
  it('accepts 0.5', () => expect(validateConfidence(0.5)).toBe(true));
  it('rejects -0.1', () => expect(validateConfidence(-0.1)).toBe(false));
  it('rejects 1.1', () => expect(validateConfidence(1.1)).toBe(false));
  it('rejects NaN', () => expect(validateConfidence(NaN)).toBe(false));
});

describe('computeTTL', () => {
  it('computes epoch seconds for a given date and retention days', () => {
    const created = '2024-01-01T00:00:00.000Z';
    const ttl = computeTTL(created, 30);
    const expected = Math.floor((new Date(created).getTime() + 30 * 86400000) / 1000);
    expect(ttl).toBe(expected);
  });

  it('accepts a Date object', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const ttl = computeTTL(date, 10);
    const expected = Math.floor((date.getTime() + 10 * 86400000) / 1000);
    expect(ttl).toBe(expected);
  });
});

describe('computeContentTTL', () => {
  it('uses CONTENT_RETENTION_DAYS (30)', () => {
    const created = '2024-01-01T00:00:00.000Z';
    expect(computeContentTTL(created)).toBe(computeTTL(created, CONTENT_RETENTION_DAYS));
  });
});

describe('computeAuditTTL', () => {
  it('uses AUDIT_RETENTION_MONTHS (12) converted to days', () => {
    const created = '2024-01-01T00:00:00.000Z';
    expect(computeAuditTTL(created)).toBe(computeTTL(created, AUDIT_RETENTION_MONTHS * 30));
  });

  it('produces a TTL much larger than content TTL', () => {
    const created = '2024-01-01T00:00:00.000Z';
    expect(computeAuditTTL(created)).toBeGreaterThan(computeContentTTL(created));
  });
});

describe('validateSignalEvent', () => {
  const validEvent = {
    eventId: 'abc-123',
    eventType: EventType.MessageSent,
    sessionId: 'sess-1',
    userId: 'user-1',
    timestamp: '2024-01-01T00:00:00Z',
    geoRegion: 'US',
    deviceFingerprint: 'fp-1',
    payload: { text: 'hello' },
  };

  it('accepts a valid SignalEvent', () => {
    expect(validateSignalEvent(validEvent)).toBe(true);
  });

  it('rejects null', () => expect(validateSignalEvent(null)).toBe(false));
  it('rejects a string', () => expect(validateSignalEvent('nope')).toBe(false));

  it('rejects an invalid eventType', () => {
    expect(validateSignalEvent({ ...validEvent, eventType: 'invalid' })).toBe(false);
  });

  it('rejects missing fields', () => {
    const { userId, ...partial } = validEvent;
    expect(validateSignalEvent(partial)).toBe(false);
  });
});

describe('validateCompositeThreatScoreRecord', () => {
  const validRecord = {
    sessionId: 'sess-1',
    userId: 'user-1',
    compositeScore: 75,
    visualScore: 80,
    textualScore: 60,
    behavioralScore: 70,
    temporalScore: 50,
    weights: { visual: 0.3, textual: 0.3, behavioral: 0.2, temporal: 0.2 },
    degraded: false,
    degradedAnalyzers: [],
    activeInterventionLevel: InterventionLevel.Friction,
    lastUpdated: '2024-01-01T00:00:00Z',
    ttl: 1704067200,
  };

  it('accepts a valid record', () => {
    expect(validateCompositeThreatScoreRecord(validRecord)).toBe(true);
  });

  it('rejects null', () => expect(validateCompositeThreatScoreRecord(null)).toBe(false));

  it('rejects score out of range', () => {
    expect(validateCompositeThreatScoreRecord({ ...validRecord, compositeScore: 101 })).toBe(false);
  });

  it('rejects invalid intervention level', () => {
    expect(validateCompositeThreatScoreRecord({ ...validRecord, activeInterventionLevel: 5 })).toBe(false);
  });

  it('rejects missing weights key', () => {
    expect(
      validateCompositeThreatScoreRecord({
        ...validRecord,
        weights: { visual: 0.3, textual: 0.3, behavioral: 0.2 },
      }),
    ).toBe(false);
  });

  it('rejects non-array degradedAnalyzers', () => {
    expect(
      validateCompositeThreatScoreRecord({ ...validRecord, degradedAnalyzers: 'visual' }),
    ).toBe(false);
  });
});
