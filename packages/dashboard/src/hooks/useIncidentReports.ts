import { useEffect, useState, useCallback } from 'react';
import type { IncidentReport } from '../types';
import { createApiClient } from '../api/client';

export function useIncidentReports(baseUrl: string) {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const client = createApiClient({ baseUrl });
    const result = await client.fetchIncidentReports();
    if (result.error) {
      setError(result.error.message);
    } else {
      setReports(result.data);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, error, loading, refetch: fetchReports };
}
