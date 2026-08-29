import { useEffect, useState, useCallback } from 'react';
import type { AppealRecord } from '../types';
import { AppealStatus } from '../types';
import { createApiClient } from '../api/client';

export function useAppeals(baseUrl: string, status?: AppealStatus) {
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    const client = createApiClient({ baseUrl });
    const result = await client.fetchAppeals(status);
    if (result.error) {
      setError(result.error.message);
    } else {
      setAppeals(result.data);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl, status]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  return { appeals, error, loading, refetch: fetchAppeals };
}
