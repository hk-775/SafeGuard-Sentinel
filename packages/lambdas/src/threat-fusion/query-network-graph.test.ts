import { describe, it, expect, vi } from 'vitest';
import { queryNetworkGraph } from './query-network-graph';
import type { NeptuneGraphClient } from './types';

function makeNeptune(accounts: string[] = []): NeptuneGraphClient {
  return { findCorrelatedAccounts: vi.fn().mockResolvedValue(accounts) };
}

describe('queryNetworkGraph', () => {
  it('queries Neptune when score >= 94', async () => {
    const neptune = makeNeptune(['acc-2', 'acc-3', 'acc-4']);
    const result = await queryNetworkGraph('acc-1', 94, neptune);
    expect(neptune.findCorrelatedAccounts).toHaveBeenCalledWith('acc-1');
    expect(result.correlatedAccounts).toEqual(['acc-2', 'acc-3', 'acc-4']);
    expect(result.correlationCount).toBe(3);
  });

  it('skips query when score < 94', async () => {
    const neptune = makeNeptune(['acc-2']);
    const result = await queryNetworkGraph('acc-1', 93.99, neptune);
    expect(neptune.findCorrelatedAccounts).not.toHaveBeenCalled();
    expect(result.correlatedAccounts).toEqual([]);
    expect(result.correlationCount).toBe(0);
  });

  it('returns empty when Neptune finds no correlations', async () => {
    const neptune = makeNeptune([]);
    const result = await queryNetworkGraph('acc-1', 95, neptune);
    expect(result.correlatedAccounts).toEqual([]);
    expect(result.correlationCount).toBe(0);
  });

  it('queries at exactly the Level 4 threshold', async () => {
    const neptune = makeNeptune(['acc-2']);
    const result = await queryNetworkGraph('acc-1', 94, neptune);
    expect(neptune.findCorrelatedAccounts).toHaveBeenCalled();
    expect(result.correlationCount).toBe(1);
  });
});
