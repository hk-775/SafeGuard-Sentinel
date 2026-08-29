import { describe, it, expect, vi } from 'vitest';
import { detectAccountClustering } from './detect-account-clustering';
import type { NeptuneClient, ClusterResult } from './types';

function makeNeptune(clusters: ClusterResult[]): NeptuneClient {
  return {
    findClustersByAccount: vi.fn().mockResolvedValue(clusters),
  };
}

describe('detectAccountClustering', () => {
  it('returns no cluster when Neptune finds nothing', async () => {
    const neptune = makeNeptune([]);

    const result = await detectAccountClustering('account-1', neptune);

    expect(result.clusterDetected).toBe(false);
    expect(result.clusterIds).toEqual([]);
    expect(result.correlationTypes).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  it('returns cluster with shared device fingerprints', async () => {
    const neptune = makeNeptune([
      {
        clusterIds: ['account-2', 'account-3'],
        correlationType: 'shared_device',
        confidence: 0.95,
      },
    ]);

    const result = await detectAccountClustering('account-1', neptune);

    expect(result.clusterDetected).toBe(true);
    expect(result.clusterIds).toEqual(['account-2', 'account-3']);
    expect(result.correlationTypes).toEqual(['shared_device']);
    expect(result.confidence).toBe(0.95);
  });

  it('merges multiple clusters and deduplicates IDs', async () => {
    const neptune = makeNeptune([
      {
        clusterIds: ['account-2', 'account-3'],
        correlationType: 'shared_device',
        confidence: 0.8,
      },
      {
        clusterIds: ['account-3', 'account-4'],
        correlationType: 'simultaneous_creation',
        confidence: 0.9,
      },
    ]);

    const result = await detectAccountClustering('account-1', neptune);

    expect(result.clusterDetected).toBe(true);
    expect(result.clusterIds).toHaveLength(3);
    expect(result.clusterIds).toContain('account-2');
    expect(result.clusterIds).toContain('account-3');
    expect(result.clusterIds).toContain('account-4');
    expect(result.correlationTypes).toContain('shared_device');
    expect(result.correlationTypes).toContain('simultaneous_creation');
    expect(result.confidence).toBe(0.9); // highest confidence
  });

  it('reports overlapping behavioral patterns', async () => {
    const neptune = makeNeptune([
      {
        clusterIds: ['account-5', 'account-6', 'account-7'],
        correlationType: 'overlapping_behavior',
        confidence: 0.75,
      },
    ]);

    const result = await detectAccountClustering('account-1', neptune);

    expect(result.clusterDetected).toBe(true);
    expect(result.clusterIds).toEqual(['account-5', 'account-6', 'account-7']);
    expect(result.correlationTypes).toEqual(['overlapping_behavior']);
  });

  it('passes the correct account ID to Neptune', async () => {
    const neptune = makeNeptune([]);

    await detectAccountClustering('account-42', neptune);

    expect(neptune.findClustersByAccount).toHaveBeenCalledWith('account-42');
  });
});
