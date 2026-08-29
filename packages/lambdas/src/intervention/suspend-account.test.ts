import { describe, it, expect, vi } from 'vitest';
import { suspendAccount, type SuspendAccountDeps } from './suspend-account';

function makeDeps(): SuspendAccountDeps {
  return {
    interactionRestriction: { applyRestriction: vi.fn().mockResolvedValue(undefined) },
    evidence: { assembleEvidencePackage: vi.fn().mockResolvedValue(undefined) },
    escalationQueue: { enqueue: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('suspendAccount', () => {
  it('applies a match restriction to the flagged account', async () => {
    const deps = makeDeps();
    await suspendAccount('user-1', 'session-1', [], deps);

    expect(deps.interactionRestriction.applyRestriction).toHaveBeenCalledWith('user-1');
  });

  it('triggers evidence package generation', async () => {
    const deps = makeDeps();
    await suspendAccount('user-1', 'session-1', ['acc-2'], deps);

    expect(deps.evidence.assembleEvidencePackage).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      ['acc-2'],
    );
  });

  it('routes the case to the Human Escalation Queue', async () => {
    const deps = makeDeps();
    await suspendAccount('user-1', 'session-1', [], deps);

    expect(deps.escalationQueue.enqueue).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      'interaction_restriction',
    );
  });

  it('executes all three steps in order', async () => {
    const callOrder: string[] = [];
    const deps: SuspendAccountDeps = {
      interactionRestriction: {
        applyRestriction: vi.fn().mockImplementation(async () => { callOrder.push('restrict'); }),
      },
      evidence: {
        assembleEvidencePackage: vi.fn().mockImplementation(async () => { callOrder.push('evidence'); }),
      },
      escalationQueue: {
        enqueue: vi.fn().mockImplementation(async () => { callOrder.push('escalate'); }),
      },
    };

    await suspendAccount('user-1', 'session-1', [], deps);
    expect(callOrder).toEqual(['restrict', 'evidence', 'escalate']);
  });

  it('passes correlated accounts to evidence assembly', async () => {
    const deps = makeDeps();
    const accounts = ['acc-2', 'acc-3', 'acc-4'];
    await suspendAccount('user-1', 'session-1', accounts, deps);

    expect(deps.evidence.assembleEvidencePackage).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      accounts,
    );
  });
});
