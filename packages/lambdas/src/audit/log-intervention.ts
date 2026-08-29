import type { AuditLogEntry, LogInterventionDeps } from './types';

/**
 * Writes an intervention audit log entry to OpenSearch.
 *
 * Uses the interventionId as the document ID so entries are
 * idempotent on retry.
 *
 * Validates: Requirements 18.1, 18.2
 */
export async function logIntervention(
  entry: AuditLogEntry,
  deps: LogInterventionDeps,
): Promise<void> {
  await deps.openSearchClient.index({
    indexName: deps.indexName,
    documentId: entry.interventionId,
    body: {
      interventionId: entry.interventionId,
      timestamp: entry.timestamp,
      interventionLevel: entry.interventionLevel,
      interventionType: entry.interventionType,
      targetAccounts: entry.targetAccounts,
      triggeringScore: entry.triggeringScore,
      signalBreakdown: entry.signalBreakdown,
      actionTaken: entry.actionTaken,
      outcome: entry.outcome,
      humanReviewRequired: entry.humanReviewRequired,
      escalationQueueId: entry.escalationQueueId,
    },
  });
}
