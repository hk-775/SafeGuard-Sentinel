import { describe, it, expect, vi } from 'vitest';
import { trackInteraction, computeBehavioralRiskScore } from './handler';
import type { BehavioralAnalyzerDeps } from './types';
import { EventType, SignalSeverity, ThreatCategory } from '@safeguard-sentinel/shared';
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
    timestamp: '2025-01-15T12:10:00Z',
    geoRegion: 'US',
    deviceFingerprint: 'fp-abc',
    payload: { targetId: 'user-2' },
    ...overrides,
  };
}

function makeDeps(overrides: {
  distinctRecipients?: string[];
  recentConnections?: import('./types').ConnectionRecord[];
  clusters?: import('./types').ClusterResult[];
} = {}): BehavioralAnalyzerDeps {
  return {
    sessionStore: {
      recordInteraction: vi.fn().mockResolvedValue(undefined),
      getDistinctRecipientsInWindow: vi.fn().mockResolvedValue(overrides.distinctRecipients ?? []),
      getRecentConnections: vi.fn().mockResolvedValue(overrides.recentConnections ?? []),
    },
    neptune: {
      findClustersByAccount: vi.fn().mockResolvedValue(overrides.clusters ?? []),
    },
    eventBridge: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// computeBehavioralRiskScore
// ---------------------------------------------------------------------------

describe('computeBehavioralRiskScore', () => {
  it('returns 0 when all analyses are clean', () => {
    const score = computeBehavioralRiskScore(
      { isAnomaly: false, distinctRecipientCount: 5, windowMinutes: 10, threshold: 47 },
      { isAnomaly: false, indiscriminateConnections: false, newAccountExclusivity: false, acceptanceRate: 0.5, newAccountConnectionRate: 0.1, totalConnections: 10 },
      { clusterDetected: false, clusterIds: [], correlationTypes: [], confidence: 0 },
    );
    expect(score).toBe(0);
  });

  it('scores velocity anomaly at 40 points', () => {
    const score = computeBehavioralRiskScore(
      { isAnomaly: true, distinctRecipientCount: 50, windowMinutes: 10, threshold: 47 },
      { isAnomaly: false, indiscriminateConnections: false, newAccountExclusivity: false, acceptanceRate: 0.5, newAccountConnectionRate: 0.1, totalConnections: 10 },
      { clusterDetected: false, clusterIds: [], correlationTypes: [], confidence: 0 },
    );
    expect(score).toBe(40);
  });

  it('scores connection anomaly at 30 points', () => {
    const score = computeBehavioralRiskScore(
      { isAnomaly: false, distinctRecipientCount: 5, windowMinutes: 10, threshold: 47 },
      { isAnomaly: true, indiscriminateConnections: true, newAccountExclusivity: false, acceptanceRate: 0.95, newAccountConnectionRate: 0.1, totalConnections: 10 },
      { clusterDetected: false, clusterIds: [], correlationTypes: [], confidence: 0 },
    );
    expect(score).toBe(30);
  });

  it('scores clustering by confidence * 30', () => {
    const score = computeBehavioralRiskScore(
      { isAnomaly: false, distinctRecipientCount: 5, windowMinutes: 10, threshold: 47 },
      { isAnomaly: false, indiscriminateConnections: false, newAccountExclusivity: false, acceptanceRate: 0.5, newAccountConnectionRate: 0.1, totalConnections: 10 },
      { clusterDetected: true, clusterIds: ['a', 'b'], correlationTypes: ['shared_device'], confidence: 0.8 },
    );
    // 0.8 * 30 = 24
    expect(score).toBe(24);
  });

  it('caps score at 100', () => {
    const score = computeBehavioralRiskScore(
      { isAnomaly: true, distinctRecipientCount: 50, windowMinutes: 10, threshold: 47 },
      { isAnomaly: true, indiscriminateConnections: true, newAccountExclusivity: true, acceptanceRate: 1, newAccountConnectionRate: 1, totalConnections: 10 },
      { clusterDetected: true, clusterIds: ['a', 'b', 'c'], correlationTypes: ['shared_device'], confidence: 1.0 },
    );
    // 40 + 30 + 30 = 100
    expect(score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// trackInteraction handler
// ---------------------------------------------------------------------------

describe('trackInteraction', () => {
  it('returns an AnalyzerOutputEvent with analyzerId "behavioral"', async () => {
    const deps = makeDeps();
    const result = await trackInteraction(makeEvent(), deps);

    expect(result.analyzerId).toBe('behavioral');
    expect(result.sessionId).toBe('session-1');
    expect(result.userId).toBe('user-1');
  });

  it('records the interaction before running analyses', async () => {
    const deps = makeDeps();
    await trackInteraction(makeEvent(), deps);

    expect(deps.sessionStore.recordInteraction).toHaveBeenCalledWith({
      userId: 'user-1',
      targetId: 'user-2',
      interactionType: 'message',
      timestamp: '2025-01-15T12:10:00Z',
    });
  });

  it('publishes behavioral.risk.score event to EventBridge', async () => {
    const deps = makeDeps();
    await trackInteraction(makeEvent(), deps);

    expect(deps.eventBridge.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'safeguard-sentinel.behavioral-analyzer',
        detailType: 'behavioral.risk.score',
      }),
    );
  });

  it('returns score 0 and no signals for clean interaction', async () => {
    const deps = makeDeps();
    const result = await trackInteraction(makeEvent(), deps);

    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('includes velocity anomaly signal when detected', async () => {
    const recipients = Array.from({ length: 50 }, (_, i) => `user-${i}`);
    const deps = makeDeps({ distinctRecipients: recipients });

    const result = await trackInteraction(makeEvent(), deps);

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.VelocityAnomaly,
        }),
      ]),
    );
  });

  it('includes cluster IDs in metadata', async () => {
    const deps = makeDeps({
      clusters: [
        { clusterIds: ['acc-2', 'acc-3'], correlationType: 'shared_device', confidence: 0.9 },
      ],
    });

    const result = await trackInteraction(makeEvent(), deps);

    expect(result.metadata).toEqual(
      expect.objectContaining({ clusterIds: ['acc-2', 'acc-3'] }),
    );
  });

  it('maps interaction event type correctly', async () => {
    const deps = makeDeps();
    const event = makeEvent({ eventType: EventType.Interaction });
    await trackInteraction(event, deps);

    expect(deps.sessionStore.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ interactionType: 'interaction' }),
    );
  });

  it('maps connection event type correctly', async () => {
    const deps = makeDeps();
    const event = makeEvent({ eventType: EventType.Connection });
    await trackInteraction(event, deps);

    expect(deps.sessionStore.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ interactionType: 'connection' }),
    );
  });

  it('falls back to empty targetId when missing from payload', async () => {
    const deps = makeDeps();
    const event = makeEvent({ payload: {} });
    await trackInteraction(event, deps);

    expect(deps.sessionStore.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: '' }),
    );
  });
});
