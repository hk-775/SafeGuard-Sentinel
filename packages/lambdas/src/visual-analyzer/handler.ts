import {
  type SignalEvent,
  type AnalyzerOutputEvent,
  type Signal,
  SignalSeverity,
  EventType,
  ThreatCategory,
  PHOTO_SIMILARITY_THRESHOLD,
} from '@safeguard-sentinel/shared';

import type {
  VisualAnalyzerDeps,
  ModerationResult,
  FaceComparisonResult,
  ManipulationResult,
  ReverseImageSearchResult,
} from './types';

// ---------------------------------------------------------------------------
// Score computation helpers
// ---------------------------------------------------------------------------

/** Weight applied to each sub-signal when computing the final visual risk score. */
const SIGNAL_WEIGHTS = {
  moderation: 25,
  manipulation: 35,
  crossAccount: 20,
  scamDatabase: 20,
} as const;

/**
 * Computes a visual risk score (0-100) from the individual analysis results.
 *
 * Each sub-signal contributes a weighted portion:
 *  - moderation:    up to 25 pts  (based on highest label confidence)
 *  - manipulation:  up to 35 pts  (binary * confidence)
 *  - crossAccount:  up to 20 pts  (match above threshold * similarity)
 *  - scamDatabase:  up to 20 pts  (match * confidence)
 */
export function computeVisualRiskScore(
  moderation: ModerationResult,
  manipulation: ManipulationResult,
  faceComparison: FaceComparisonResult,
  reverseSearch: ReverseImageSearchResult,
): number {
  const moderationScore =
    moderation.labels.length > 0
      ? Math.max(...moderation.labels.map((l) => l.confidence)) * SIGNAL_WEIGHTS.moderation
      : 0;

  const manipulationScore = manipulation.manipulationDetected
    ? manipulation.confidence * SIGNAL_WEIGHTS.manipulation
    : 0;

  const crossAccountScore =
    faceComparison.matchedAccounts.length > 0 && faceComparison.similarity >= PHOTO_SIMILARITY_THRESHOLD
      ? faceComparison.similarity * SIGNAL_WEIGHTS.crossAccount
      : 0;

  const scamDbScore = reverseSearch.matched
    ? reverseSearch.confidence * SIGNAL_WEIGHTS.scamDatabase
    : 0;

  return Math.min(100, Math.round(moderationScore + manipulationScore + crossAccountScore + scamDbScore));
}

// ---------------------------------------------------------------------------
// Signal builders
// ---------------------------------------------------------------------------

function buildSignals(
  moderation: ModerationResult,
  manipulation: ManipulationResult,
  faceComparison: FaceComparisonResult,
  reverseSearch: ReverseImageSearchResult,
  timestamp: string,
): Signal[] {
  const signals: Signal[] = [];

  if (moderation.labels.length > 0) {
    signals.push({
      signalType: ThreatCategory.PhotoManipulation,
      severity: severityFromConfidence(Math.max(...moderation.labels.map((l) => l.confidence))),
      details: { labels: moderation.labels },
      timestamp,
    });
  }

  if (manipulation.manipulationDetected) {
    signals.push({
      signalType: ThreatCategory.PhotoManipulation,
      severity: severityFromConfidence(manipulation.confidence),
      details: { artifactType: manipulation.artifactType },
      timestamp,
    });
  }

  if (faceComparison.matchedAccounts.length > 0 && faceComparison.similarity >= PHOTO_SIMILARITY_THRESHOLD) {
    signals.push({
      signalType: ThreatCategory.CrossAccountMatch,
      severity: severityFromConfidence(faceComparison.similarity),
      details: { matchedAccounts: faceComparison.matchedAccounts, similarity: faceComparison.similarity },
      timestamp,
    });
  }

  if (reverseSearch.matched) {
    signals.push({
      signalType: 'scam_database_match',
      severity: severityFromConfidence(reverseSearch.confidence),
      details: { matchedImageIds: reverseSearch.matchedImageIds },
      timestamp,
    });
  }

  return signals;
}

function severityFromConfidence(confidence: number): SignalSeverity {
  if (confidence >= 0.9) return SignalSeverity.Critical;
  if (confidence >= 0.7) return SignalSeverity.High;
  if (confidence >= 0.4) return SignalSeverity.Medium;
  return SignalSeverity.Low;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Analyzes a photo upload event by calling Rekognition for label detection,
 * face comparison, manipulation detection, and reverse image search against
 * the scam database. Returns an AnalyzerOutputEvent with the visual risk
 * score and detected signals.
 *
 * Operates independently of Face Check initial verification — analyzes
 * photos throughout the account lifecycle (Requirement 2.4).
 */
export async function analyzePhoto(
  event: SignalEvent,
  deps: VisualAnalyzerDeps,
): Promise<AnalyzerOutputEvent> {
  const imageKey = (event.payload?.imageKey as string) ?? event.eventId;

  // Run all analyses concurrently
  const [moderation, faceComparison, manipulation, reverseSearch] = await Promise.all([
    deps.rekognition.detectLabels(imageKey),
    deps.rekognition.compareFaces(imageKey),
    deps.rekognition.detectCustomLabels(imageKey),
    deps.scamDatabase.reverseImageSearch(imageKey),
  ]);

  const score = computeVisualRiskScore(moderation, manipulation, faceComparison, reverseSearch);
  const signals = buildSignals(moderation, manipulation, faceComparison, reverseSearch, event.timestamp);

  const confidence =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + severityToWeight(s.severity), 0) / signals.length
      : 0;

  const output: AnalyzerOutputEvent = {
    analyzerId: 'visual',
    sessionId: event.sessionId,
    userId: event.userId,
    score,
    confidence: Math.min(1, confidence),
    signals,
    metadata: {
      matchedAccounts: faceComparison.matchedAccounts,
      imageKey,
    },
  };

  // Publish to EventBridge
  await deps.eventBridge.publish({
    source: 'safeguard-sentinel.visual-analyzer',
    detailType: 'visual.risk.score',
    detail: output,
  });

  return output;
}

function severityToWeight(severity: SignalSeverity): number {
  switch (severity) {
    case SignalSeverity.Critical: return 1.0;
    case SignalSeverity.High: return 0.8;
    case SignalSeverity.Medium: return 0.5;
    case SignalSeverity.Low: return 0.2;
  }
}
