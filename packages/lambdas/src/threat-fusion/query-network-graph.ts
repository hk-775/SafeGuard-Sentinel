import { INTERVENTION_THRESHOLDS } from '@safeguard-sentinel/shared';
import type { NeptuneGraphClient, NetworkQueryResult } from './types';

/**
 * Queries Neptune for account correlations when the composite score
 * approaches the Level 4 threshold (>= 94%).
 *
 * Returns the list of correlated accounts and the count. This information
 * is used by the Intervention Orchestrator to decide whether to execute
 * a Network Disruption (requires 3+ correlated accounts).
 *
 * If the score is below the Level 4 threshold, the query is skipped and
 * an empty result is returned.
 *
 * @param accountId - The account to query correlations for.
 * @param compositeScore - The current composite threat score.
 * @param neptune - The Neptune graph client dependency.
 * @returns A NetworkQueryResult with correlated accounts.
 */
export async function queryNetworkGraph(
  accountId: string,
  compositeScore: number,
  neptune: NeptuneGraphClient,
): Promise<NetworkQueryResult> {
  if (compositeScore < INTERVENTION_THRESHOLDS.LEVEL_4) {
    return { correlatedAccounts: [], correlationCount: 0 };
  }

  const correlatedAccounts = await neptune.findCorrelatedAccounts(accountId);

  return {
    correlatedAccounts,
    correlationCount: correlatedAccounts.length,
  };
}
