import { describe, it, expect, vi } from 'vitest';
import { analyzePhoto, computeVisualRiskScore } from './handler';
import type { VisualAnalyzerDeps, ModerationResult, FaceComparisonResult, ManipulationResult, ReverseImageSearchResult } from './types';
import { EventType, SignalSeverity, ThreatCategory } from '@safeguard-sentinel/shared';
import type { SignalEvent } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<SignalEvent> = {}): SignalEvent {
  return {
    eventId: 'evt-1',
    eventType: EventType.PhotoUpload,
    sessionId: 'session-1',
    userId: 'user-1',
    timestamp: '2025-01-15T12:00:00Z',
    geoRegion: 'US',
    deviceFingerprint: 'fp-abc',
    payload: { imageKey: 'photos/user-1/img.jpg' },
    ...overrides,
  };
}

function makeDeps(overrides: Partial<{
  moderation: ModerationResult;
  faceComparison: FaceComparisonResult;
  manipulation: ManipulationResult;
  reverseSearch: ReverseImageSearchResult;
}> = {}): VisualAnalyzerDeps {
  const moderation: ModerationResult = overrides.moderation ?? { labels: [] };
  const faceComparison: FaceComparisonResult = overrides.faceComparison ?? { matchedAccounts: [], similarity: 0 };
  const manipulation: ManipulationResult = overrides.manipulation ?? { manipulationDetected: false, artifactType: null, confidence: 0 };
  const reverseSearch: ReverseImageSearchResult = overrides.reverseSearch ?? { matched: false, matchedImageIds: [], confidence: 0 };

  return {
    rekognition: {
      detectLabels: vi.fn().mockResolvedValue(moderation),
      compareFaces: vi.fn().mockResolvedValue(faceComparison),
      detectCustomLabels: vi.fn().mockResolvedValue(manipulation),
    },
    scamDatabase: {
      reverseImageSearch: vi.fn().mockResolvedValue(reverseSearch),
    },
    eventBridge: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// computeVisualRiskScore
// ---------------------------------------------------------------------------

describe('computeVisualRiskScore', () => {
  it('returns 0 when all analyses are clean', () => {
    const score = computeVisualRiskScore(
      { labels: [] },
      { manipulationDetected: false, artifactType: null, confidence: 0 },
      { matchedAccounts: [], similarity: 0 },
      { matched: false, matchedImageIds: [], confidence: 0 },
    );
    expect(score).toBe(0);
  });

  it('scores moderation labels by highest confidence', () => {
    const score = computeVisualRiskScore(
      { labels: [{ name: 'explicit', confidence: 0.8 }] },
      { manipulationDetected: false, artifactType: null, confidence: 0 },
      { matchedAccounts: [], similarity: 0 },
      { matched: false, matchedImageIds: [], confidence: 0 },
    );
    // 0.8 * 25 = 20
    expect(score).toBe(20);
  });

  it('scores manipulation detection', () => {
    const score = computeVisualRiskScore(
      { labels: [] },
      { manipulationDetected: true, artifactType: 'face_swap', confidence: 1.0 },
      { matchedAccounts: [], similarity: 0 },
      { matched: false, matchedImageIds: [], confidence: 0 },
    );
    // 1.0 * 35 = 35
    expect(score).toBe(35);
  });

  it('scores cross-account match only when similarity >= 0.9', () => {
    const belowThreshold = computeVisualRiskScore(
      { labels: [] },
      { manipulationDetected: false, artifactType: null, confidence: 0 },
      { matchedAccounts: ['user-2'], similarity: 0.89 },
      { matched: false, matchedImageIds: [], confidence: 0 },
    );
    expect(belowThreshold).toBe(0);

    const atThreshold = computeVisualRiskScore(
      { labels: [] },
      { manipulationDetected: false, artifactType: null, confidence: 0 },
      { matchedAccounts: ['user-2'], similarity: 0.9 },
      { matched: false, matchedImageIds: [], confidence: 0 },
    );
    // 0.9 * 20 = 18
    expect(atThreshold).toBe(18);
  });

  it('scores scam database match', () => {
    const score = computeVisualRiskScore(
      { labels: [] },
      { manipulationDetected: false, artifactType: null, confidence: 0 },
      { matchedAccounts: [], similarity: 0 },
      { matched: true, matchedImageIds: ['img-scam-1'], confidence: 0.95 },
    );
    // 0.95 * 20 = 19
    expect(score).toBe(19);
  });

  it('caps score at 100', () => {
    const score = computeVisualRiskScore(
      { labels: [{ name: 'explicit', confidence: 1.0 }] },
      { manipulationDetected: true, artifactType: 'generative_ai', confidence: 1.0 },
      { matchedAccounts: ['user-2'], similarity: 1.0 },
      { matched: true, matchedImageIds: ['img-1'], confidence: 1.0 },
    );
    // 25 + 35 + 20 + 20 = 100
    expect(score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// analyzePhoto handler
// ---------------------------------------------------------------------------

describe('analyzePhoto', () => {
  it('returns an AnalyzerOutputEvent with analyzerId "visual"', async () => {
    const deps = makeDeps();
    const result = await analyzePhoto(makeEvent(), deps);

    expect(result.analyzerId).toBe('visual');
    expect(result.sessionId).toBe('session-1');
    expect(result.userId).toBe('user-1');
  });

  it('calls all service dependencies concurrently', async () => {
    const deps = makeDeps();
    await analyzePhoto(makeEvent(), deps);

    expect(deps.rekognition.detectLabels).toHaveBeenCalledWith('photos/user-1/img.jpg');
    expect(deps.rekognition.compareFaces).toHaveBeenCalledWith('photos/user-1/img.jpg');
    expect(deps.rekognition.detectCustomLabels).toHaveBeenCalledWith('photos/user-1/img.jpg');
    expect(deps.scamDatabase.reverseImageSearch).toHaveBeenCalledWith('photos/user-1/img.jpg');
  });

  it('publishes visual.risk.score event to EventBridge', async () => {
    const deps = makeDeps();
    await analyzePhoto(makeEvent(), deps);

    expect(deps.eventBridge.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'safeguard-sentinel.visual-analyzer',
        detailType: 'visual.risk.score',
      }),
    );
  });

  it('returns score 0 and no signals for a clean photo', async () => {
    const deps = makeDeps();
    const result = await analyzePhoto(makeEvent(), deps);

    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('includes manipulation signal when detected', async () => {
    const deps = makeDeps({
      manipulation: { manipulationDetected: true, artifactType: 'face_swap', confidence: 0.95 },
    });
    const result = await analyzePhoto(makeEvent(), deps);

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.PhotoManipulation,
          details: { artifactType: 'face_swap' },
        }),
      ]),
    );
  });

  it('includes cross-account match signal with matched accounts in metadata', async () => {
    const deps = makeDeps({
      faceComparison: { matchedAccounts: ['user-2', 'user-3'], similarity: 0.95 },
    });
    const result = await analyzePhoto(makeEvent(), deps);

    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: ThreatCategory.CrossAccountMatch,
        }),
      ]),
    );
    expect(result.metadata).toEqual(
      expect.objectContaining({ matchedAccounts: ['user-2', 'user-3'] }),
    );
  });

  it('falls back to eventId when imageKey is missing from payload', async () => {
    const deps = makeDeps();
    const event = makeEvent({ payload: {} });
    await analyzePhoto(event, deps);

    expect(deps.rekognition.detectLabels).toHaveBeenCalledWith('evt-1');
  });
});
