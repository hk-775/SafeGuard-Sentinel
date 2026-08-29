import type {
  EscalationCase,
  EscalationDecision,
  ConfidenceBreakdown,
  EscalationDeps,
  EscalationPayload,
} from './types';

// ---------------------------------------------------------------------------
// Edge-case score boundaries (exclusive on both ends per Requirement 13.3)
// ---------------------------------------------------------------------------

const EDGE_CASE_LOWER = 70;
const EDGE_CASE_UPPER = 88;

// ---------------------------------------------------------------------------
// Pure function — determines whether a case should be escalated
// ---------------------------------------------------------------------------

/**
 * Evaluates an escalation case against the mandatory human escalation
 * criteria defined in Requirements 13.1–13.4.
 *
 * Routes to Human Escalation Queue for:
 *   - Serious incident reports (regardless of score)        — Req 13.1
 *   - Appeal submissions                                     — Req 13.2
 *   - Edge-case scores (70 < score < 88)                    — Req 13.3
 *   - Law enforcement / legal implications (legal-review)   — Req 13.4
 */
export function shouldEscalate(escalationCase: EscalationCase): EscalationDecision {
  const flags: string[] = [];

  if (escalationCase.isSerious) {
    flags.push('serious-incident');
  }

  if (escalationCase.isAppeal) {
    flags.push('appeal');
  }

  if (
    escalationCase.compositeScore > EDGE_CASE_LOWER &&
    escalationCase.compositeScore < EDGE_CASE_UPPER
  ) {
    flags.push('edge-case');
  }

  if (escalationCase.hasLegalImplications) {
    flags.push('legal-review');
  }

  return {
    shouldRoute: flags.length > 0,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Routing function — sends the case to the Human Escalation Queue
// ---------------------------------------------------------------------------

/**
 * Routes an escalation case to the Human Escalation Queue with the complete
 * Evidence Package and confidence scoring breakdown (Requirement 13.5).
 */
export async function routeToEscalation(
  escalationCase: EscalationCase,
  confidenceBreakdown: ConfidenceBreakdown,
  deps: EscalationDeps,
): Promise<EscalationPayload | null> {
  const decision = shouldEscalate(escalationCase);

  if (!decision.shouldRoute) {
    return null;
  }

  const payload: EscalationPayload = {
    caseId: escalationCase.caseId,
    sessionId: escalationCase.sessionId,
    userId: escalationCase.userId,
    evidencePackageId: escalationCase.evidencePackageId,
    confidenceBreakdown,
    flags: decision.flags,
  };

  await deps.queueClient.send(payload);

  return payload;
}
