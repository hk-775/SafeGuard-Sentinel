import type {
  AnalyzerOutputEvent,
  CompositeThreatScoreRecord,
} from '@safeguard-sentinel/shared';
import { InterventionLevel, INTERVENTION_THRESHOLDS, CONTENT_RETENTION_DAYS } from '@safeguard-sentinel/shared';

import type { ThreatFusionDeps } from './types';
import { computeCompositeScore, DEFAULT_WEIGHTS } from './compute-composite-score';
import { markDegraded } from './mark-degraded';
import { emitThreatEvent } from './emit-threat-event';
import { queryNetworkGraph } from './query-network-graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveInterventionLevel(score: number, correlatedAccountCount: number): InterventionLevel {
  if (score >= INTERVENTION_THRESHOLDS.LEVEL_4 && correlatedAccountCount >= 3) {
    return InterventionLevel.NetworkDisruption;
  }
  if (score >= INTERVENTION_THRESHOLDS.LEVEL_3) {
    return InterventionLevel.InteractionRestriction;
  }
  if (score >= INTERVENTION_THRESHOLDS.LEVEL_2) {
    return InterventionLevel.Friction;
  }
  if (score >= INTERVENTION_THRESHOLDS.LEVEL_1) {
    return InterventionLevel.SafetyPrompt;
  }
  return InterventionLevel.None;
}

function computeTTL(): number {
  return Math.floor(Date.now() / 1000) + CONTENT_RETENTION_DAYS * 24 * 60 * 60;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Receives an individual analyzer score via EventBridge, retrieves the
 * current session state from DynamoDB, computes the weighted composite
 * score, stores the updated record, and emits a threat event when the
 * score meets or exceeds the 60% threshold.
 *
 * The handler is designed to be invoked once per analyzer output event.
 * It merges the incoming score with the existing session state so that
 * the composite is always up-to-date.
 */
export async function fuseSignals(
  analyzerEvent: AnalyzerOutputEvent,
  deps: ThreatFusionDeps,
): Promise<CompositeThreatScoreRecord> {
  const { sessionId, userId, analyzerId, score } = analyzerEvent;

  // 1. Retrieve current session state (or initialise)
  const existing = await deps.sessionStateStore.getScoreRecord(sessionId);

  const visualScore = analyzerId === 'visual' ? score : (existing?.visualScore ?? 0);
  const textualScore = analyzerId === 'textual' ? score : (existing?.textualScore ?? 0);
  const behavioralScore = analyzerId === 'behavioral' ? score : (existing?.behavioralScore ?? 0);
  const temporalScore = analyzerId === 'temporal' ? score : (existing?.temporalScore ?? 0);

  const weights = existing?.weights ?? DEFAULT_WEIGHTS;

  // 2. Check for degraded state — build a list of outputs we "have"
  const receivedOutputs: AnalyzerOutputEvent[] = [];
  if (visualScore > 0 || analyzerId === 'visual') {
    receivedOutputs.push({ ...analyzerEvent, analyzerId: 'visual', score: visualScore });
  }
  if (textualScore > 0 || analyzerId === 'textual') {
    receivedOutputs.push({ ...analyzerEvent, analyzerId: 'textual', score: textualScore });
  }
  if (behavioralScore > 0 || analyzerId === 'behavioral') {
    receivedOutputs.push({ ...analyzerEvent, analyzerId: 'behavioral', score: behavioralScore });
  }
  if (temporalScore > 0 || analyzerId === 'temporal') {
    receivedOutputs.push({ ...analyzerEvent, analyzerId: 'temporal', score: temporalScore });
  }

  const degradedResult = markDegraded(receivedOutputs);

  // 3. Compute composite score
  const compositeScore = computeCompositeScore({
    visualScore,
    textualScore,
    behavioralScore,
    temporalScore,
    weights,
  });

  // 4. Query network graph if approaching Level 4
  const networkResult = await queryNetworkGraph(userId, compositeScore, deps.neptune);

  // 5. Determine intervention level
  const activeInterventionLevel = resolveInterventionLevel(
    compositeScore,
    networkResult.correlationCount,
  );

  // 6. Build and persist the score record
  const record: CompositeThreatScoreRecord = {
    sessionId,
    userId,
    compositeScore,
    visualScore,
    textualScore,
    behavioralScore,
    temporalScore,
    weights,
    degraded: degradedResult.degraded,
    degradedAnalyzers: degradedResult.degradedAnalyzers,
    activeInterventionLevel,
    lastUpdated: new Date().toISOString(),
    ttl: computeTTL(),
  };

  await deps.sessionStateStore.putScoreRecord(record);

  // 7. Emit threat event if threshold met
  await emitThreatEvent(record, deps.eventBridge);

  return record;
}
