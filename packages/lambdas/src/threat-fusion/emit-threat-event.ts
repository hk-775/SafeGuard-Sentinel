import { INTERVENTION_THRESHOLDS } from '@safeguard-sentinel/shared';
import type { CompositeThreatScoreRecord } from '@safeguard-sentinel/shared';
import type { ThreatEventBridgeClient } from './types';

/**
 * Emits a threat event to EventBridge when the composite score meets or
 * exceeds the Level 1 threshold (60%).
 *
 * No event is emitted for scores below the threshold (Requirement 1.3).
 *
 * @returns `true` if a threat event was emitted, `false` otherwise.
 */
export async function emitThreatEvent(
  record: CompositeThreatScoreRecord,
  eventBridge: ThreatEventBridgeClient,
): Promise<boolean> {
  if (record.compositeScore < INTERVENTION_THRESHOLDS.LEVEL_1) {
    return false;
  }

  await eventBridge.publish({
    source: 'safeguard-sentinel.threat-fusion',
    detailType: 'threat.detected',
    detail: {
      sessionId: record.sessionId,
      userId: record.userId,
      compositeScore: record.compositeScore,
      visualScore: record.visualScore,
      textualScore: record.textualScore,
      behavioralScore: record.behavioralScore,
      temporalScore: record.temporalScore,
      degraded: record.degraded,
      degradedAnalyzers: record.degradedAnalyzers,
      activeInterventionLevel: record.activeInterventionLevel,
      timestamp: record.lastUpdated,
    },
  });

  return true;
}
