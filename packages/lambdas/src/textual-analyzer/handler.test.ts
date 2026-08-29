import { describe, it, expect, vi } from 'vitest';
import { analyzeMessage, computeTextualRiskScore } from './handler';
import type { TextualAnalyzerDeps } from './types';
import { EventType, ThreatCategory } from '@safeguard-sentinel/shared';
import type { SignalEvent } from '@safeguard-sentinel/shared';
import type { ScamScriptDetectionResult } from './detect-scam-script';
import type { CoercionDetectionResult } from './detect-coercion';
import type { FinancialSolicitationResult } from './detect-financial-solicitation';
import type { TemplatedMessagingResult } from './detect-templated-messaging';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<SignalEvent> = {}): SignalEvent {
  return {
    eventId: 'evt-msg-1',
    eventType: EventType.MessageSent,
    sessionId: 'session-1',
    userId: 'user-1',
    timestamp: '2025-01-15T12:00:00Z',
    geoRegion: 'US',
    deviceFingerprint: 'fp-abc',
    payload: { messageContent: 'Hello, how are you?', recipientId: 'user-2' },
    ...overrides,
  };
}

function makeDeps(overrides: Partial<{
  scamSimilarity: number;
  scamMatchedScriptId: string | null;
  coercionDetected: boolean;
  coercionPatterns: ('pressure' | 'isolation' | 'urgency')[];
  coercionConfidence: number;
  financialDetected: boolean;
  financialPatterns: string[];
  financialConfidence: number;
  recentMessages: { recipientId: string; contentHash: string; timestamp: string }[];
}> = {}): TextualAnalyzerDeps {
  return {
    comprehend: {
      analyzeSentimentAndEntities: vi.fn().mockResolvedValue({
        sentiment: 'NEUTRAL',
        sentimentScore: 0.5,
        entities: [],
      }),
      classifyCoercion: vi.fn().mockResolvedValue({
        coercionDetected: overrides.coercionDetected ?? false,
        patterns: overrides.coercionPatterns ?? [],
        confidence: overrides.coercionConfidence ?? 0,
      }),
    },
    scamScriptRepo: {
      findSimilar: vi.fn().mockResolvedValue({
        similarity: overrides.scamSimilarity ?? 0,
        matchedScriptId: overrides.scamMatchedScriptId ?? null,
      }),
    },
    messageHistory: {
      getRecentMessagesByUser: vi.fn().mockResolvedValue(overrides.recentMessages ?? []),
      storeMessage: vi.fn().mockResolvedValue(undefined),
    },
    eventBridge: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// computeTextualRiskScore
// ---------------------------------------------------------------------------

describe('computeTextualRiskScore', () => {
  const cleanScam: ScamScriptDetectionResult = { isHighConfidenceScam: false, similarity: 0, matchedScriptId: null };
  const cleanCoercion: CoercionDetectionResult = { coercionDetected: false, patterns: [], confidence: 0 };
  const cleanFinancial: FinancialSolicitationResult = { financialSolicitationDetected: false, matchedPatterns: [], confidence: 0 };
  const cleanTemplated: TemplatedMessagingResult = { templateDetected: false, matchCount: 0, contentHash: '' };

  it('returns 0 when all analyses are clean', () => {
    const score = computeTextualRiskScore(cleanScam, cleanCoercion, cleanFinancial, cleanTemplated);
    expect(score).toBe(0);
  });

  it('scores high-confidence scam script at full weight', () => {
    const scam: ScamScriptDetectionResult = { isHighConfidenceScam: true, similarity: 0.96, matchedScriptId: 'script-1' };
    const score = computeTextualRiskScore(scam, cleanCoercion, cleanFinancial, cleanTemplated);
    // 0.96 * 35 = 33.6 → 34
    expect(score).toBe(34);
  });

  it('scores below-threshold scam script at half weight', () => {
    const scam: ScamScriptDetectionResult = { isHighConfidenceScam: false, similarity: 0.8, matchedScriptId: null };
    const score = computeTextualRiskScore(scam, cleanCoercion, cleanFinancial, cleanTemplated);
    // 0.8 * 35 * 0.5 = 14
    expect(score).toBe(14);
  });

  it('scores coercion detection', () => {
    const coercion: CoercionDetectionResult = { coercionDetected: true, patterns: ['pressure'], confidence: 0.9 };
    const score = computeTextualRiskScore(cleanScam, coercion, cleanFinancial, cleanTemplated);
    // 0.9 * 25 = 22.5 → 23
    expect(score).toBe(23);
  });

  it('scores financial solicitation detection', () => {
    const financial: FinancialSolicitationResult = { financialSolicitationDetected: true, matchedPatterns: ['bitcoin_address'], confidence: 0.6 };
    const score = computeTextualRiskScore(cleanScam, cleanCoercion, financial, cleanTemplated);
    // 0.6 * 25 = 15
    expect(score).toBe(15);
  });

  it('scores templated messaging at full weight', () => {
    const templated: TemplatedMessagingResult = { templateDetected: true, matchCount: 5, contentHash: 'abc' };
    const score = computeTextualRiskScore(cleanScam, cleanCoercion, cleanFinancial, templated);
    // 15
    expect(score).toBe(15);
  });

  it('caps score at 100', () => {
    const scam: ScamScriptDetectionResult = { isHighConfidenceScam: true, similarity: 1.0, matchedScriptId: 'script-1' };
    const coercion: CoercionDetectionResult = { coercionDetected: true, patterns: ['pressure', 'urgency'], confidence: 1.0 };
    const financial: FinancialSolicitationResult = { financialSolicitationDetected: true, matchedPatterns: ['bitcoin_address'], confidence: 1.0 };
    const templated: TemplatedMessagingResult = { templateDetected: true, matchCount: 10, contentHash: 'abc' };
    const score = computeTextualRiskScore(scam, coercion, financial, templated);
    // 35 + 25 + 25 + 15 = 100
    expect(score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// analyzeMessage handler
// ---------------------------------------------------------------------------

describe('analyzeMessage', () => {
  it('returns an AnalyzerOutputEvent with analyzerId "textual"', async () => {
    const deps = makeDeps();
    const result = await analyzeMessage(makeEvent(), deps);

    expect(result.analyzerId).toBe('textual');
    expect(result.sessionId).toBe('session-1');
    expect(result.userId).toBe('user-1');
  });

  it('publishes textual.risk.score event to EventBridge', async () => {
    const deps = makeDeps();
    await analyzeMessage(makeEvent(), deps);

    expect(deps.eventBridge.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'safeguard-sentinel.textual-analyzer',
        detailType: 'textual.risk.score',
      }),
    );
  });

  it('returns score 0 and no signals for a clean message', async () => {
    const deps = makeDeps();
    const result = await analyzeMessage(makeEvent(), deps);

    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('includes scam signal when high-confidence scam detected', async () => {
    const deps = makeDeps({ scamSimilarity: 0.96, scamMatchedScriptId: 'script-1' });
    const result = await analyzeMessage(makeEvent(), deps);

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.RelationshipScam,
          details: expect.objectContaining({ matchedScriptId: 'script-1' }),
        }),
      ]),
    );
  });

  it('includes coercion signal when detected', async () => {
    const deps = makeDeps({ coercionDetected: true, coercionPatterns: ['pressure', 'urgency'], coercionConfidence: 0.85 });
    const result = await analyzeMessage(makeEvent(), deps);

    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.Coercion,
          details: { patterns: ['pressure', 'urgency'] },
        }),
      ]),
    );
  });

  it('includes templateMatchCount in metadata', async () => {
    const deps = makeDeps();
    const result = await analyzeMessage(makeEvent(), deps);

    expect(result.metadata).toEqual(
      expect.objectContaining({ templateMatchCount: expect.any(Number) }),
    );
  });

  it('handles missing messageContent gracefully', async () => {
    const deps = makeDeps();
    const event = makeEvent({ payload: {} });
    const result = await analyzeMessage(event, deps);

    expect(result.analyzerId).toBe('textual');
    expect(result.score).toBe(0);
  });
});
