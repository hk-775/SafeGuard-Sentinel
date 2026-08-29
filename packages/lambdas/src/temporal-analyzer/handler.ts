import {
  type SignalEvent,
  type AnalyzerOutputEvent,
  type Signal,
  SignalSeverity,
  ThreatCategory,
} from '@safeguard-sentinel/shared';

import type { TemporalAnalyzerDeps } from './types';
import { checkVulnerabilityWindow, type VulnerabilityWindowResult } from './check-vulnerability-window';
import { detectRapidEscalation, type RapidEscalationResult } from './detect-rapid-escalation';
import { detectTimezoneInconsistency, type TimezoneInconsistencyResult } from './detect-timezone-inconsistency';

// ---------------------------------------------------------------------------
// Score computation helpers
// ---------------------------------------------------------------------------

/** Weight applied to each sub-signal when computing the final temporal risk score. */
const SIGNAL_WEIGHTS = {
  vulnerabilityWindow: 35,
  rapidEscalation: 40,
  timezoneInconsistency: 25,
} as const;

/**
 * Computes a temporal risk score (0-100) from the individual analysis results.
 *
 * Each sub-signal contributes a weighted portion:
 *  - vulnerabilityWindow: up to 35 pts (active in window = full weight)
 *  - rapidEscalation:     up to 40 pts (rapid escalation detected = full weight)
 *  - timezoneInconsistency: up to 25 pts (inconsistency detected = full weight)
 */
export function computeTemporalRiskScore(
  vulnerability: VulnerabilityWindowResult,
  escalation: RapidEscalationResult,
  timezone: TimezoneInconsistencyResult,
): number {
  const vulnerabilityScore = vulnerability.isVulnerable
    ? SIGNAL_WEIGHTS.vulnerabilityWindow
    : 0;

  const escalationScore = escalation.isRapidEscalation
    ? SIGNAL_WEIGHTS.rapidEscalation
    : 0;

  const timezoneScore = timezone.isInconsistent
    ? SIGNAL_WEIGHTS.timezoneInconsistency
    : 0;

  return Math.min(100, vulnerabilityScore + escalationScore + timezoneScore);
}

// ---------------------------------------------------------------------------
// Signal builders
// ---------------------------------------------------------------------------

function buildSignals(
  vulnerability: VulnerabilityWindowResult,
  escalation: RapidEscalationResult,
  timezone: TimezoneInconsistencyResult,
  timestamp: string,
): Signal[] {
  const signals: Signal[] = [];

  if (vulnerability.isVulnerable) {
    signals.push({
      signalType: ThreatCategory.VulnerabilityWindow,
      severity: SignalSeverity.Medium,
      details: {
        localHour: vulnerability.localHour,
        timezone: vulnerability.timezone,
      },
      timestamp,
    });
  }

  if (escalation.isRapidEscalation) {
    signals.push({
      signalType: ThreatCategory.RapidEscalation,
      severity: SignalSeverity.High,
      details: {
        elapsedMinutes: escalation.elapsedMinutes,
        thresholdMinutes: escalation.thresholdMinutes,
      },
      timestamp,
    });
  }

  if (timezone.isInconsistent) {
    signals.push({
      signalType: ThreatCategory.TimezoneInconsistency,
      severity: SignalSeverity.High,
      details: {
        statedOffset: timezone.statedOffset,
        observedOffset: timezone.observedOffset,
        discrepancyHours: timezone.discrepancyHours,
      },
      timestamp,
    });
  }

  return signals;
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
 * Evaluates time-based risk for every event: vulnerability window,
 * escalation velocity, and timezone consistency. Publishes
 * `temporal.risk.score` event to EventBridge with
 * `{ sessionId, score, signals[], localTime, timezone }`.
 */
export async function evaluateTemporalRisk(
  event: SignalEvent,
  deps: TemporalAnalyzerDeps,
): Promise<AnalyzerOutputEvent> {
  // Run all analyses concurrently
  const [vulnerability, escalation, timezone] = await Promise.all([
    checkVulnerabilityWindow(event.userId, event.timestamp, deps.timezoneService),
    detectRapidEscalation(event.sessionId, deps.escalationTracker),
    detectTimezoneInconsistency(event.userId, deps.timezoneService, deps.activityPatternService),
  ]);

  const score = computeTemporalRiskScore(vulnerability, escalation, timezone);
  const signals = buildSignals(vulnerability, escalation, timezone, event.timestamp);

  const confidence =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + severityToWeight(s.severity), 0) / signals.length
      : 0;

  const output: AnalyzerOutputEvent = {
    analyzerId: 'temporal',
    sessionId: event.sessionId,
    userId: event.userId,
    score,
    confidence: Math.min(1, confidence),
    signals,
    metadata: {
      localTime: vulnerability.localTime,
      timezone: vulnerability.timezone,
    },
  };

  // Publish to EventBridge
  await deps.eventBridge.publish({
    source: 'safeguard-sentinel.temporal-analyzer',
    detailType: 'temporal.risk.score',
    detail: output,
  });

  return output;
}
