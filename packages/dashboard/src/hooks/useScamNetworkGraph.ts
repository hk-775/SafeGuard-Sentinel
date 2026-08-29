import { useEffect, useState, useCallback } from 'react';
import type { GraphVertex, GraphEdge } from '../types';
import { createApiClient } from '../api/client';

export function useScamNetworkGraph(baseUrl: string, accountId: string | undefined) {
  const [vertices, setVertices] = useState<GraphVertex[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGraph = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const client = createApiClient({ baseUrl });
    const result = await client.fetchScamNetworkGraph(accountId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setVertices(result.data.vertices);
      setEdges(result.data.edges);
      setError(null);
    }
    setLoading(false);
  }, [baseUrl, accountId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { vertices, edges, error, loading, refetch: fetchGraph };
}
