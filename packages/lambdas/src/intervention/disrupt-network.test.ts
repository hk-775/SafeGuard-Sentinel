import { describe, it, expect, vi } from 'vitest';
import { disruptNetwork, type DisruptNetworkDeps } from './disrupt-network';

function makeDeps(): DisruptNetworkDeps {
  return {
    accountDisable: { disableAccounts: vi.fn().mockResolvedValue(undefined) },
    evidence: { preserveEvidence: vi.fn().mockResolvedValue(undefined) },
    escalation: { notifyWithGraph: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('disruptNetwork', () => {
  const accountIds = ['user-1', 'acc-2', 'acc-3', 'acc-4'];

  it('disables all correlated accounts simultaneously', async () => {
    const deps = makeDeps();
    await disruptNetwork(accountIds, deps);

    expect(deps.accountDisable.disableAccounts).toHaveBeenCalledWith(accountIds);
  });

  it('preserves evidence across all disabled accounts', async () => {
    const deps = makeDeps();
    await disruptNetwork(accountIds, deps);

    expect(deps.evidence.preserveEvidence).toHaveBeenCalledWith(accountIds);
  });

  it('notifies the Human Escalation Queue with the network graph', async () => {
    const deps = makeDeps();
    await disruptNetwork(accountIds, deps);

    expect(deps.escalation.notifyWithGraph).toHaveBeenCalledWith(
      accountIds,
      expect.objectContaining({
        accountIds,
        correlationType: 'network_disruption',
      }),
    );
  });

  it('executes steps in order: disable, evidence, escalation', async () => {
    const callOrder: string[] = [];
    const deps: DisruptNetworkDeps = {
      accountDisable: {
        disableAccounts: vi.fn().mockImplementation(async () => { callOrder.push('disable'); }),
      },
      evidence: {
        preserveEvidence: vi.fn().mockImplementation(async () => { callOrder.push('evidence'); }),
      },
      escalation: {
        notifyWithGraph: vi.fn().mockImplementation(async () => { callOrder.push('escalate'); }),
      },
    };

    await disruptNetwork(accountIds, deps);
    expect(callOrder).toEqual(['disable', 'evidence', 'escalate']);
  });

  it('includes all account IDs in the network graph snapshot', async () => {
    const deps = makeDeps();
    const ids = ['a', 'b', 'c'];
    await disruptNetwork(ids, deps);

    expect(deps.escalation.notifyWithGraph).toHaveBeenCalledWith(
      ids,
      expect.objectContaining({ accountIds: ids }),
    );
  });
});
