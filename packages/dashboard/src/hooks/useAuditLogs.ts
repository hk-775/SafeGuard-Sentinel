import { useEffect, useState, useCallback } from 'react';
import type { AuditLogEntry, AuditSearchFilters } from '../types';
import { createApiClient } from '../api/client';

export function useAuditLogs(baseUrl: string, filters: AuditSearchFilters) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const client = createApiClient({ baseUrl });
    const result = await client.searchAuditLogs(filters);
    if (result.error) {
      setError(result.error.message);
    } else {
      setLogs(result.data);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl, JSON.stringify(filters)]);

  useEffect(() => {
    fetchLogs();
    setPage(0);
  }, [fetchLogs]);

  const paginatedLogs = logs.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(logs.length / pageSize);

  return {
    logs: paginatedLogs,
    allLogs: logs,
    error,
    loading,
    page,
    totalPages,
    setPage,
    refetch: fetchLogs,
  };
}
