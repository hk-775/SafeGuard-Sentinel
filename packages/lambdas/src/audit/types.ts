import type {
  InterventionLevel,
  InterventionType,
  InterventionOutcome,
} from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Audit module — injectable interfaces
// ---------------------------------------------------------------------------

/** Minimal OpenSearch client for indexing audit documents. */
export interface OpenSearchClient {
  index(params: {
    indexName: string;
    documentId: string;
    body: Record<string, unknown>;
  }): Promise<void>;
}

/** A single audit log entry for an intervention. */
export interface AuditLogEntry {
  interventionId: string;
  timestamp: string;
  interventionLevel: InterventionLevel;
  interventionType: InterventionType;
  targetAccounts: string[];
  triggeringScore: number;
  signalBreakdown: {
    visual: number;
    textual: number;
    behavioral: number;
    temporal: number;
  };
  actionTaken: string;
  outcome: InterventionOutcome;
  humanReviewRequired: boolean;
  escalationQueueId: string | null;
}

/** Dependencies injected into the logIntervention function. */
export interface LogInterventionDeps {
  openSearchClient: OpenSearchClient;
  indexName: string;
}

/** Minimal OpenSearch client for searching audit documents. */
export interface OpenSearchSearchClient {
  search(params: {
    indexName: string;
    query: Record<string, unknown>;
  }): Promise<{ hits: AuditLogEntry[] }>;
}

/** Filters for searching audit logs. */
export interface AuditSearchFilters {
  dateFrom?: string;
  dateTo?: string;
  interventionLevel?: InterventionLevel;
  accountId?: string;
  threatType?: string;
  query?: string;
}

/** Dependencies injected into the searchAuditLogs function. */
export interface SearchAuditLogsDeps {
  searchClient: OpenSearchSearchClient;
  indexName: string;
}
