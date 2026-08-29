import { useEffect, useState, useCallback } from 'react';
import type { ActiveIntervention, DashboardEvent } from '../types';
import { createApiClient } from '../api/client';
import { reduceThreatList } from '../components/ThreatList';

export function useActiveInterventions(
  baseUrl: string,
  subscribe: (handler: (event: DashboardEvent) => void) => () => void
) {
  const [interventions, setInterventions] = useState<ActiveIntervention[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInterventions = useCallback(async () => {
    const client = createApiClient({ baseUrl });
    const result = await client.fetchActiveInterventions();
    if (result.error) {
      setError(result.error.message);
    } else {
      setInterventions(result.data);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl]);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  useEffect(() => {
    const unsubscribe = subscribe((event: DashboardEvent) => {
      if (event.type === 'threat' || event.type === 'intervention' || event.type === 'resolution') {
        setInterventions((prev) => {
          const result = reduceThreatList({ interventions: prev }, event);
          return result.interventions;
        });
      }
    });
    return unsubscribe;
  }, [subscribe]);

  return { interventions, error, loading, refetch: fetchInterventions };
}
