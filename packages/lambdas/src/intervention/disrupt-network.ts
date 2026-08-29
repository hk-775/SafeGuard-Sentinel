// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

export interface AccountDisableClient {
  disableAccounts(accountIds: string[]): Promise<void>;
}

export interface NetworkEvidenceClient {
  preserveEvidence(accountIds: string[]): Promise<void>;
}

export interface NetworkEscalationClient {
  notifyWithGraph(accountIds: string[], networkGraph: NetworkGraphSnapshot): Promise<void>;
}

/** Snapshot of the scam network graph sent to the escalation queue. */
export interface NetworkGraphSnapshot {
  accountIds: string[];
  correlationType: string;
}

export interface DisruptNetworkDeps {
  accountDisable: AccountDisableClient;
  evidence: NetworkEvidenceClient;
  escalation: NetworkEscalationClient;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Level 4 intervention — disables all correlated accounts simultaneously,
 * preserves evidence across all disabled accounts, and notifies the Human
 * Escalation Queue with the full scam network graph and evidence packages.
 */
export async function disruptNetwork(
  accountIds: string[],
  deps: DisruptNetworkDeps,
): Promise<void> {
  await deps.accountDisable.disableAccounts(accountIds);
  await deps.evidence.preserveEvidence(accountIds);

  const networkGraph: NetworkGraphSnapshot = {
    accountIds,
    correlationType: 'network_disruption',
  };
  await deps.escalation.notifyWithGraph(accountIds, networkGraph);
}
