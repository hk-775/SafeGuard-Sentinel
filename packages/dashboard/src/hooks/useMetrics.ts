import { useEffect, useState, useCallback } from 'react';
import type { AggregateMetrics, DashboardEvent } from '../types';
import { createApiClient } from '../api/client';

export function useMetrics(
  baseUrl: string,
  subscribe: (handler: (event: DashboardEvent) => void) => () => void
) {
  const [metrics, setMetrics] = useState<AggregateMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    const client = createApiClient({ baseUrl });
    const result = await client.fetchAggregateMetrics();
    if (result.error) {
      setError(result.error.message);
    } else {
      setMetrics(result.data);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const unsubscribe = subscribe((event: DashboardEvent) => {
      if (event.type === 'metric' && metrics) {
        const payload = event.payload as Partial<AggregateMetrics>;
        setMetrics((prev) => (prev ? { ...prev, ...payload } : prev));
      }
    });
    return unsubscribe;
  }, [subscribe, metrics]);

  return { metrics, error, loading, refetch: fetchMetrics };
}
