// ---------------------------------------------------------------------------
// Escalation module — injectable interfaces and data types
// ---------------------------------------------------------------------------

/** Represents a case that may need human escalation. */
export interface EscalationCase {
  caseId: string;
  sessionId: string;
  userId: string;
  compositeScore: number;
  isSerious: boolean;
  isAppeal: boolean;
  hasLegalImplications: boolean;
  evidencePackageId: string;
}

/** Confidence scoring breakdown included with every escalated case. */
export interface ConfidenceBreakdown {
  compositeScore: number;
  visualScore: number;
  textualScore: number;
  behavioralScore: number;
  temporalScore: number;
}

/** Payload sent to the Human Escalation Queue. */
export interface EscalationPayload {
  caseId: string;
  sessionId: string;
  userId: string;
  evidencePackageId: string;
  confidenceBreakdown: ConfidenceBreakdown;
  flags: string[];
}

/** Result of the shouldEscalate pure function. */
export interface EscalationDecision {
  shouldRoute: boolean;
  flags: string[];
}

/** Injectable queue client for routing cases to the Human Escalation Queue. */
export interface EscalationQueueClient {
  send(payload: EscalationPayload): Promise<void>;
}

/** Dependencies injected into the escalation routing handler. */
export interface EscalationDeps {
  queueClient: EscalationQueueClient;
}
