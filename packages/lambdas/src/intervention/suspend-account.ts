// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

export interface InteractionRestrictionClient {
  applyRestriction(userId: string): Promise<void>;
}

export interface EvidenceClient {
  assembleEvidencePackage(sessionId: string, userId: string, correlatedAccounts: string[]): Promise<void>;
}

export interface EscalationQueueClient {
  enqueue(sessionId: string, userId: string, reason: string): Promise<void>;
}

export interface SuspendAccountDeps {
  interactionRestriction: InteractionRestrictionClient;
  evidence: EvidenceClient;
  escalationQueue: EscalationQueueClient;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Level 3 intervention — applies an interaction restriction to the flagged account,
 * triggers evidence package generation, and routes the case to the Human
 * Escalation Queue for post-action review.
 */
export async function suspendAccount(
  userId: string,
  sessionId: string,
  correlatedAccounts: string[],
  deps: SuspendAccountDeps,
): Promise<void> {
  await deps.interactionRestriction.applyRestriction(userId);
  await deps.evidence.assembleEvidencePackage(sessionId, userId, correlatedAccounts);
  await deps.escalationQueue.enqueue(sessionId, userId, 'interaction_restriction');
}
