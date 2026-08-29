import type { NeptuneClient, ClusterResult } from './types';

/** Result of account clustering detection. */
export interface AccountClusteringResult {
  clusterDetected: boolean;
  clusterIds: string[];
  correlationTypes: string[];
  confidence: number; // 0-1, highest confidence across clusters
}

/**
 * Queries Neptune for shared device fingerprints, simultaneous creation
 * times, and overlapping behavioral patterns. Reports account clustering
 * signal with all correlated account IDs.
 */
export async function detectAccountClustering(
  accountId: string,
  neptune: NeptuneClient,
): Promise<AccountClusteringResult> {
  const clusters = await neptune.findClustersByAccount(accountId);

  if (clusters.length === 0) {
    return {
      clusterDetected: false,
      clusterIds: [],
      correlationTypes: [],
      confidence: 0,
    };
  }

  // Merge all cluster IDs into a deduplicated set
  const allClusterIds = new Set<string>();
  const correlationTypes = new Set<string>();
  let maxConfidence = 0;

  for (const cluster of clusters) {
    for (const id of cluster.clusterIds) {
      allClusterIds.add(id);
    }
    correlationTypes.add(cluster.correlationType);
    if (cluster.confidence > maxConfidence) {
      maxConfidence = cluster.confidence;
    }
  }

  const clusterIds = Array.from(allClusterIds);

  return {
    clusterDetected: clusterIds.length > 0,
    clusterIds,
    correlationTypes: Array.from(correlationTypes),
    confidence: maxConfidence,
  };
}
