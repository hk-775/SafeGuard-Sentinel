import {
  type SignalEvent,
  type AnalyzerOutputEvent,
  type Signal,
  SignalSeverity,
  ThreatCategory,
  SCAM_SCRIPT_SIMILARITY_THRESHOLD,
} from '@safeguard-sentinel/shared';

import type { TextualAnalyzerDeps } from './types';
import { detectScamScript, type ScamScriptDetectionResult } from './detect-scam-script';
import { detectCoercion, type CoercionDetectionResult } from './detect-coercion';
import { detectFinancialSolicitation, type FinancialSolicitationResult } from './detect-financial-solicitation';
import { detectTemplatedMessaging, type TemplatedMessagingResult } from './detect-templated-messaging';

// ---------------------------------------------------------------------------
// Score computation helpers
// ---------------------------------------------------------------------------

/** Weight applied to each sub-signal when computing the final textual risk score. */
const SIGNAL_WEIGHTS = {
  scamScript: 35,
  coercion: 25,
  financialSolicitation: 25,
  templatedMessaging: 15,
} as const;

/**
 * Computes a textual risk score (0-100) from the individual analysis results.
 *
 * Each sub-signal contributes a weighted portion:
 *  - scamScript:            up to 35 pts (high-confidence scam = full weight * similarity)
 *  - coercion:              up to 25 pts (detected = confidence * weight)
 *  - financialSolicitation: up to 25 pts (detected = confidence * weight)
 *  - templatedMessaging:    up to 15 pts (detected = full weight)
 */
export function computeTextualRiskScore(
  scamScript: ScamScriptDetectionResult,
  coercion: CoercionDetectionResult,
  financial: FinancialSolicitationResult,
  templated: TemplatedMessagingResult,
): number {
  const scamScore = scamScript.isHighConfidenceScam
    ? scamScript.similarity * SIGNAL_WEIGHTS.scamScript
    : scamScript.similarity * SIGNAL_WEIGHTS.scamScript * 0.5;

  const coercionScore = coercion.coercionDetected
    ? coercion.confidence * SIGNAL_WEIGHTS.coercion
    : 0;

  const financialScore = financial.financialSolicitationDetected
    ? financial.confidence * SIGNAL_WEIGHTS.financialSolicitation
    : 0;

  const templatedScore = templated.templateDetected
    ? SIGNAL_WEIGHTS.templatedMessaging
    : 0;

  return Math.min(100, Math.round(scamScore + coercionScore + financialScore + templatedScore));
}

// ---------------------------------------------------------------------------
// Signal builders
// ---------------------------------------------------------------------------

function buildSignals(
  scamScript: ScamScriptDetectionResult,
  coercion: CoercionDetectionResult,
  financial: FinancialSolicitationResult,
  templated: TemplatedMessagingResult,
  timestamp: string,
): Signal[] {
  const signals: Signal[] = [];

  if (scamScript.isHighConfidenceScam) {
    signals.push({
      signalType: ThreatCategory.RelationshipScam,
      severity: severityFromConfidence(scamScript.similarity),
      details: { matchedScriptId: scamScript.matchedScriptId, similarity: scamScript.similarity },
      timestamp,
    });
  }

  if (coercion.coercionDetected) {
    signals.push({
      signalType: ThreatCategory.Coercion,
      severity: severityFromConfidence(coercion.confidence),
      details: { patterns: coercion.patterns },
      timestamp,
    });
  }

  if (financial.financialSolicitationDetected) {
    signals.push({
      signalType: ThreatCategory.FinancialSolicitation,
      severity: severityFromConfidence(financial.confidence),
      details: { matchedPatterns: financial.matchedPatterns },
      timestamp,
    });
  }

  if (templated.templateDetected) {
    signals.push({
      signalType: ThreatCategory.TemplatedMessaging,
      severity: templated.matchCount >= 5 ? SignalSeverity.High : SignalSeverity.Medium,
      details: { matchCount: templated.matchCount, contentHash: templated.contentHash },
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
 * Analyzes a message event by running Comprehend sentiment/entity analysis,
 * scam script detection, coercion detection, financial solicitation detection,
 * and templated messaging detection. Returns an AnalyzerOutputEvent with the
 * textual risk score and detected signals.
 *
 * Publishes `textual.risk.score` event to EventBridge with
 * `{ sessionId, score, signals[], templateMatchCount }`.
 */
export async function analyzeMessage(
  event: SignalEvent,
  deps: TextualAnalyzerDeps,
): Promise<AnalyzerOutputEvent> {
  const messageContent = (event.payload?.messageContent as string) ?? '';
  const recipientId = (event.payload?.recipientId as string) ?? '';

  // Run all analyses concurrently
  const [scamScript, coercion, financial, templated] = await Promise.all([
    detectScamScript(messageContent, deps.scamScriptRepo),
    detectCoercion(messageContent, deps.comprehend),
    detectFinancialSolicitation(messageContent, deps.comprehend),
    detectTemplatedMessaging(event.userId, recipientId, messageContent, event.timestamp, deps.messageHistory),
  ]);

  const score = computeTextualRiskScore(scamScript, coercion, financial, templated);
  const signals = buildSignals(scamScript, coercion, financial, templated, event.timestamp);

  const confidence =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + severityToWeight(s.severity), 0) / signals.length
      : 0;

  const output: AnalyzerOutputEvent = {
    analyzerId: 'textual',
    sessionId: event.sessionId,
    userId: event.userId,
    score,
    confidence: Math.min(1, confidence),
    signals,
    metadata: {
      templateMatchCount: templated.matchCount,
    },
  };

  // Publish to EventBridge
  await deps.eventBridge.publish({
    source: 'safeguard-sentinel.textual-analyzer',
    detailType: 'textual.risk.score',
    detail: output,
  });

  return output;
}
