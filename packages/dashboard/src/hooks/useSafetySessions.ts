import { useEffect, useState, useCallback } from 'react';
import type { SafetySession } from '../types';
import { createApiClient } from '../api/client';

export function useSafetySessions(baseUrl: string) {
  const [sessions, setSessions] = useState<SafetySession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const client = createApiClient({ baseUrl });
    const result = await client.fetchSafetySessions();
    if (result.error) {
      setError(result.error.message);
    } else {
      setSessions(result.data);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, error, loading, refetch: fetchSessions };
}
