import { AUDIT_RETENTION_MONTHS } from '@safeguard-sentinel/shared';
import type { AuditLogEntry, AuditSearchFilters, SearchAuditLogsDeps } from './types';

export { AUDIT_RETENTION_MONTHS };

/**
 * Searches audit logs in OpenSearch using the provided filters.
 *
 * Builds an OpenSearch bool query from the defined filter fields.
 * Only filters that are not undefined are included in the query.
 *
 * Validates: Requirements 18.2, 18.3
 */
export async function searchAuditLogs(
  filters: AuditSearchFilters,
  deps: SearchAuditLogsDeps,
): Promise<AuditLogEntry[]> {
  const must: Record<string, unknown>[] = [];

  if (filters.dateFrom !== undefined || filters.dateTo !== undefined) {
    const range: Record<string, string> = {};
    if (filters.dateFrom !== undefined) {
      range.gte = filters.dateFrom;
    }
    if (filters.dateTo !== undefined) {
      range.lte = filters.dateTo;
    }
    must.push({ range: { timestamp: range } });
  }

  if (filters.interventionLevel !== undefined) {
    must.push({ term: { interventionLevel: filters.interventionLevel } });
  }

  if (filters.accountId !== undefined) {
    must.push({ term: { targetAccounts: filters.accountId } });
  }

  if (filters.threatType !== undefined) {
    must.push({ term: { interventionType: filters.threatType } });
  }

  if (filters.query !== undefined) {
    must.push({ match: { _all: filters.query } });
  }

  const query: Record<string, unknown> =
    must.length > 0 ? { bool: { must } } : { match_all: {} };

  const result = await deps.searchClient.search({
    indexName: deps.indexName,
    query,
  });

  return result.hits;
}
