import {
  type SignalEvent,
  type AnalyzerOutputEvent,
  type Signal,
  SignalSeverity,
  ThreatCategory,
} from '@safeguard-sentinel/shared';

import type { BehavioralAnalyzerDeps } from './types';
import { detectVelocityAnomaly, type VelocityAnomalyResult } from './detect-velocity-anomaly';
import { detectConnectionAnomaly, type ConnectionAnomalyResult } from './detect-connection-anomaly';
import { detectAccountClustering, type AccountClusteringResult } from './detect-account-clustering';

// ---------------------------------------------------------------------------
// Score computation helpers
// ---------------------------------------------------------------------------

/** Weight applied to each sub-signal when computing the final behavioral risk score. */
const SIGNAL_WEIGHTS = {
  velocity: 40,
  connection: 30,
  clustering: 30,
} as const;

/**
 * Computes a behavioral risk score (0-100) from the individual analysis results.
 *
 * Each sub-signal contributes a weighted portion:
 *  - velocity:    up to 40 pts (anomaly detected = full weight)
 *  - connection:  up to 30 pts (anomaly detected = full weight)
 *  - clustering:  up to 30 pts (cluster detected = confidence * weight)
 */
export function computeBehavioralRiskScore(
  velocity: VelocityAnomalyResult,
  connection: ConnectionAnomalyResult,
  clustering: AccountClusteringResult,
): number {
  const velocityScore = velocity.isAnomaly ? SIGNAL_WEIGHTS.velocity : 0;

  const connectionScore = connection.isAnomaly ? SIGNAL_WEIGHTS.connection : 0;

  const clusteringScore = clustering.clusterDetected
    ? clustering.confidence * SIGNAL_WEIGHTS.clustering
    : 0;

  return Math.min(100, Math.round(velocityScore + connectionScore + clusteringScore));
}

// ---------------------------------------------------------------------------
// Signal builders
// ---------------------------------------------------------------------------

function buildSignals(
  velocity: VelocityAnomalyResult,
  connection: ConnectionAnomalyResult,
  clustering: AccountClusteringResult,
  timestamp: string,
): Signal[] {
  const signals: Signal[] = [];

  if (velocity.isAnomaly) {
    signals.push({
      signalType: ThreatCategory.VelocityAnomaly,
      severity: SignalSeverity.High,
      details: {
        distinctRecipientCount: velocity.distinctRecipientCount,
        windowMinutes: velocity.windowMinutes,
        threshold: velocity.threshold,
      },
      timestamp,
    });
  }

  if (connection.isAnomaly) {
    signals.push({
      signalType: ThreatCategory.ConnectionAnomaly,
      severity: connection.indiscriminateConnections && connection.newAccountExclusivity
        ? SignalSeverity.Critical
        : SignalSeverity.High,
      details: {
        indiscriminateConnections: connection.indiscriminateConnections,
        newAccountExclusivity: connection.newAccountExclusivity,
        acceptanceRate: connection.acceptanceRate,
        newAccountConnectionRate: connection.newAccountConnectionRate,
        totalConnections: connection.totalConnections,
      },
      timestamp,
    });
  }

  if (clustering.clusterDetected) {
    signals.push({
      signalType: ThreatCategory.AccountClustering,
      severity: severityFromConfidence(clustering.confidence),
      details: {
        clusterIds: clustering.clusterIds,
        correlationTypes: clustering.correlationTypes,
      },
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

function severityToWeight(severity: SignalSeverity): number {
  switch (severity) {
    case SignalSeverity.Critical: return 1.0;
    case SignalSeverity.High: return 0.8;
    case SignalSeverity.Medium: return 0.5;
    case SignalSeverity.Low: return 0.2;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Records platform activity (messages, interactions, and connections) in the
 * DynamoDB session table. Runs velocity anomaly, connection anomaly,
 * and account clustering detection concurrently. Publishes
 * `behavioral.risk.score` event to EventBridge with
 * `{ sessionId, score, signals[], clusterIds[] }`.
 */
export async function trackInteraction(
  event: SignalEvent,
  deps: BehavioralAnalyzerDeps,
): Promise<AnalyzerOutputEvent> {
  const targetId = (event.payload?.targetId as string) ?? '';
  const interactionType = mapEventToInteractionType(event.eventType);

  // Record the interaction
  await deps.sessionStore.recordInteraction({
    userId: event.userId,
    targetId,
    interactionType,
    timestamp: event.timestamp,
  });

  // Run all analyses concurrently
  const [velocity, connection, clustering] = await Promise.all([
    detectVelocityAnomaly(event.userId, event.timestamp, deps.sessionStore),
    detectConnectionAnomaly(event.userId, deps.sessionStore),
    detectAccountClustering(event.userId, deps.neptune),
  ]);

  const score = computeBehavioralRiskScore(velocity, connection, clustering);
  const signals = buildSignals(velocity, connection, clustering, event.timestamp);

  const confidence =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + severityToWeight(s.severity), 0) / signals.length
      : 0;

  const output: AnalyzerOutputEvent = {
    analyzerId: 'behavioral',
    sessionId: event.sessionId,
    userId: event.userId,
    score,
    confidence: Math.min(1, confidence),
    signals,
    metadata: {
      clusterIds: clustering.clusterIds,
    },
  };

  // Publish to EventBridge
  await deps.eventBridge.publish({
    source: 'safeguard-sentinel.behavioral-analyzer',
    detailType: 'behavioral.risk.score',
    detail: output,
  });

  return output;
}

function mapEventToInteractionType(
  eventType: string,
): 'message' | 'interaction' | 'connection' {
  switch (eventType) {
    case 'message_sent': return 'message';
    case 'interaction': return 'interaction';
    case 'connection': return 'connection';
    default: return 'message';
  }
}
