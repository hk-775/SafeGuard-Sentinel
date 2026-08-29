import { useEffect, useState, useCallback } from 'react';
import type { EvidencePackage } from '../types';
import { createApiClient } from '../api/client';

export function useEvidencePackage(baseUrl: string, packageId: string | undefined) {
  const [evidencePackage, setEvidencePackage] = useState<EvidencePackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPackage = useCallback(async () => {
    if (!packageId) return;
    setLoading(true);
    const client = createApiClient({ baseUrl });
    const result = await client.fetchEvidencePackage(packageId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setEvidencePackage(result.data);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl, packageId]);

  useEffect(() => {
    fetchPackage();
  }, [fetchPackage]);

  return { evidencePackage, error, loading, refetch: fetchPackage };
}
