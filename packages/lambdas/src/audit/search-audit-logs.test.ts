import { describe, it, expect, vi } from 'vitest';
import { searchAuditLogs, AUDIT_RETENTION_MONTHS } from './search-audit-logs';
import {
  InterventionLevel,
  InterventionType,
  InterventionOutcome,
} from '@safeguard-sentinel/shared';
import type { AuditLogEntry, SearchAuditLogsDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    interventionId: 'int-001',
    timestamp: '2024-06-15T10:30:00Z',
    interventionLevel: InterventionLevel.SafetyPrompt,
    interventionType: InterventionType.SafetyPrompt,
    targetAccounts: ['acc-1'],
    triggeringScore: 65,
    signalBreakdown: { visual: 20, textual: 30, behavioral: 10, temporal: 5 },
    actionTaken: 'Injected safety prompt',
    outcome: InterventionOutcome.Pending,
    humanReviewRequired: false,
    escalationQueueId: null,
    ...overrides,
  };
}

function makeDeps(hits: AuditLogEntry[] = []): SearchAuditLogsDeps {
  return {
    searchClient: {
      search: vi.fn().mockResolvedValue({ hits }),
    },
    indexName: 'audit-interventions',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('searchAuditLogs', () => {
  it('should return all results when no filters are provided', async () => {
    const entries = [makeEntry(), makeEntry({ interventionId: 'int-002' })];
    const deps = makeDeps(entries);

    const result = await searchAuditLogs({}, deps);

    expect(result).toEqual(entries);
    expect(deps.searchClient.search).toHaveBeenCalledWith({
      indexName: 'audit-interventions',
      query: { match_all: {} },
    });
  });

  it('should build a date range filter from dateFrom and dateTo', async () => {
    const deps = makeDeps([]);

    await searchAuditLogs(
      { dateFrom: '2024-01-01T00:00:00Z', dateTo: '2024-06-30T23:59:59Z' },
      deps,
    );

    expect(deps.searchClient.search).toHaveBeenCalledWith({
      indexName: 'audit-interventions',
      query: {
        bool: {
          must: [
            {
              range: {
                timestamp: {
                  gte: '2024-01-01T00:00:00Z',
                  lte: '2024-06-30T23:59:59Z',
                },
              },
            },
          ],
        },
      },
    });
  });

  it('should build a term filter for interventionLevel', async () => {
    const deps = makeDeps([]);

    await searchAuditLogs({ interventionLevel: InterventionLevel.Friction }, deps);

    expect(deps.searchClient.search).toHaveBeenCalledWith({
      indexName: 'audit-interventions',
      query: {
        bool: {
          must: [{ term: { interventionLevel: InterventionLevel.Friction } }],
        },
      },
    });
  });

  it('should build a term filter for accountId on targetAccounts', async () => {
    const deps = makeDeps([]);

    await searchAuditLogs({ accountId: 'acc-42' }, deps);

    expect(deps.searchClient.search).toHaveBeenCalledWith({
      indexName: 'audit-interventions',
      query: {
        bool: {
          must: [{ term: { targetAccounts: 'acc-42' } }],
        },
      },
    });
  });

  it('should build a match query for full-text search', async () => {
    const deps = makeDeps([]);

    await searchAuditLogs({ query: 'romance scam' }, deps);

    expect(deps.searchClient.search).toHaveBeenCalledWith({
      indexName: 'audit-interventions',
      query: {
        bool: {
          must: [{ match: { _all: 'romance scam' } }],
        },
      },
    });
  });

  it('should combine multiple filters into a single bool must query', async () => {
    const deps = makeDeps([]);

    await searchAuditLogs(
      {
        dateFrom: '2024-03-01T00:00:00Z',
        interventionLevel: InterventionLevel.NetworkDisruption,
        accountId: 'acc-99',
        threatType: InterventionType.NetworkDisruption,
        query: 'coordinated',
      },
      deps,
    );

    const call = vi.mocked(deps.searchClient.search).mock.calls[0][0];
    const must = (call.query as { bool: { must: unknown[] } }).bool.must;

    expect(must).toHaveLength(5);
    expect(must).toContainEqual({
      range: { timestamp: { gte: '2024-03-01T00:00:00Z' } },
    });
    expect(must).toContainEqual({
      term: { interventionLevel: InterventionLevel.NetworkDisruption },
    });
    expect(must).toContainEqual({ term: { targetAccounts: 'acc-99' } });
    expect(must).toContainEqual({
      term: { interventionType: InterventionType.NetworkDisruption },
    });
    expect(must).toContainEqual({ match: { _all: 'coordinated' } });
  });

  it('should export AUDIT_RETENTION_MONTHS as 12', () => {
    expect(AUDIT_RETENTION_MONTHS).toBe(12);
  });
});
