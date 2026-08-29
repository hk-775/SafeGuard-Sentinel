import { describe, it, expect, vi } from 'vitest';
import type {
  AccountVertex,
  PhotoVertex,
  WalletAddressVertex,
  MessageTemplateVertex,
  UsesPhotoEdge,
  SharesWalletEdge,
  SendsTemplateEdge,
  CorrelatedWithEdge,
  SameDeviceEdge,
  GraphEdge,
} from '@safeguard-sentinel/shared';
import type { ScamNetworkDeps, ScamNetworkNeptuneClient } from './types';
import {
  addAccountVertex,
  addPhotoVertex,
  addWalletAddressVertex,
  addMessageTemplateVertex,
  addUsesPhotoEdge,
  addSharesWalletEdge,
  addSendsTemplateEdge,
  addCorrelatedWithEdge,
  addSameDeviceEdge,
  getAccountVertex,
  getEdgesForAccount,
  findCorrelatedCluster,
} from './graph-access';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(overrides: Partial<ScamNetworkNeptuneClient> = {}): ScamNetworkDeps {
  return {
    neptune: {
      addAccountVertex: vi.fn().mockResolvedValue(undefined),
      addPhotoVertex: vi.fn().mockResolvedValue(undefined),
      addWalletAddressVertex: vi.fn().mockResolvedValue(undefined),
      addMessageTemplateVertex: vi.fn().mockResolvedValue(undefined),
      addUsesPhotoEdge: vi.fn().mockResolvedValue(undefined),
      addSharesWalletEdge: vi.fn().mockResolvedValue(undefined),
      addSendsTemplateEdge: vi.fn().mockResolvedValue(undefined),
      addCorrelatedWithEdge: vi.fn().mockResolvedValue(undefined),
      addSameDeviceEdge: vi.fn().mockResolvedValue(undefined),
      getAccountVertex: vi.fn().mockResolvedValue(null),
      getEdgesForAccount: vi.fn().mockResolvedValue([]),
      getCorrelatedAccounts: vi.fn().mockResolvedValue([]),
      ...overrides,
    },
  };
}

const sampleAccount: AccountVertex = {
  accountId: 'acc-1',
  createdAt: '2024-01-01T00:00:00Z',
  deviceFingerprint: 'fp-abc',
  status: 'active',
};

const samplePhoto: PhotoVertex = {
  photoHash: 'hash-123',
  sourceUrl: 'https://example.com/photo.jpg',
};

const sampleWallet: WalletAddressVertex = {
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  type: 'bitcoin',
};

const sampleTemplate: MessageTemplateVertex = {
  templateHash: 'tmpl-abc',
  content: 'Hello, I am a prince...',
};

// ---------------------------------------------------------------------------
// Vertex operation tests
// ---------------------------------------------------------------------------

describe('addAccountVertex', () => {
  it('delegates to neptune client', async () => {
    const deps = makeDeps();
    await addAccountVertex(sampleAccount, deps);
    expect(deps.neptune.addAccountVertex).toHaveBeenCalledWith(sampleAccount);
  });
});

describe('addPhotoVertex', () => {
  it('delegates to neptune client', async () => {
    const deps = makeDeps();
    await addPhotoVertex(samplePhoto, deps);
    expect(deps.neptune.addPhotoVertex).toHaveBeenCalledWith(samplePhoto);
  });
});

describe('addWalletAddressVertex', () => {
  it('delegates to neptune client', async () => {
    const deps = makeDeps();
    await addWalletAddressVertex(sampleWallet, deps);
    expect(deps.neptune.addWalletAddressVertex).toHaveBeenCalledWith(sampleWallet);
  });
});

describe('addMessageTemplateVertex', () => {
  it('delegates to neptune client', async () => {
    const deps = makeDeps();
    await addMessageTemplateVertex(sampleTemplate, deps);
    expect(deps.neptune.addMessageTemplateVertex).toHaveBeenCalledWith(sampleTemplate);
  });
});

// ---------------------------------------------------------------------------
// Edge operation tests
// ---------------------------------------------------------------------------

describe('addUsesPhotoEdge', () => {
  it('delegates to neptune client', async () => {
    const edge: UsesPhotoEdge = {
      label: 'USES_PHOTO',
      from: 'acc-1',
      to: 'hash-123',
      uploadedAt: '2024-01-01T00:00:00Z',
    };
    const deps = makeDeps();
    await addUsesPhotoEdge(edge, deps);
    expect(deps.neptune.addUsesPhotoEdge).toHaveBeenCalledWith(edge);
  });
});

describe('addSharesWalletEdge', () => {
  it('delegates to neptune client', async () => {
    const edge: SharesWalletEdge = {
      label: 'SHARES_WALLET',
      from: 'acc-1',
      to: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      detectedAt: '2024-01-01T00:00:00Z',
    };
    const deps = makeDeps();
    await addSharesWalletEdge(edge, deps);
    expect(deps.neptune.addSharesWalletEdge).toHaveBeenCalledWith(edge);
  });
});

describe('addSendsTemplateEdge', () => {
  it('delegates to neptune client', async () => {
    const edge: SendsTemplateEdge = {
      label: 'SENDS_TEMPLATE',
      from: 'acc-1',
      to: 'tmpl-abc',
      sentAt: '2024-01-01T00:00:00Z',
      recipientCount: 5,
    };
    const deps = makeDeps();
    await addSendsTemplateEdge(edge, deps);
    expect(deps.neptune.addSendsTemplateEdge).toHaveBeenCalledWith(edge);
  });
});

describe('addCorrelatedWithEdge', () => {
  it('delegates to neptune client', async () => {
    const edge: CorrelatedWithEdge = {
      label: 'CORRELATED_WITH',
      from: 'acc-1',
      to: 'acc-2',
      correlationType: 'shared_wallet',
      confidence: 0.95,
      detectedAt: '2024-01-01T00:00:00Z',
    };
    const deps = makeDeps();
    await addCorrelatedWithEdge(edge, deps);
    expect(deps.neptune.addCorrelatedWithEdge).toHaveBeenCalledWith(edge);
  });
});

describe('addSameDeviceEdge', () => {
  it('delegates to neptune client', async () => {
    const edge: SameDeviceEdge = {
      label: 'SAME_DEVICE',
      from: 'acc-1',
      to: 'acc-2',
      deviceFingerprint: 'fp-abc',
    };
    const deps = makeDeps();
    await addSameDeviceEdge(edge, deps);
    expect(deps.neptune.addSameDeviceEdge).toHaveBeenCalledWith(edge);
  });
});

// ---------------------------------------------------------------------------
// Query operation tests
// ---------------------------------------------------------------------------

describe('getAccountVertex', () => {
  it('returns account when found', async () => {
    const deps = makeDeps({
      getAccountVertex: vi.fn().mockResolvedValue(sampleAccount),
    });
    const result = await getAccountVertex('acc-1', deps);
    expect(result).toEqual(sampleAccount);
    expect(deps.neptune.getAccountVertex).toHaveBeenCalledWith('acc-1');
  });

  it('returns null when account not found', async () => {
    const deps = makeDeps();
    const result = await getAccountVertex('nonexistent', deps);
    expect(result).toBeNull();
  });
});

describe('getEdgesForAccount', () => {
  it('returns edges for account', async () => {
    const edges: GraphEdge[] = [
      { label: 'USES_PHOTO', from: 'acc-1', to: 'hash-1', uploadedAt: '2024-01-01T00:00:00Z' },
      { label: 'SAME_DEVICE', from: 'acc-1', to: 'acc-2', deviceFingerprint: 'fp-abc' },
    ];
    const deps = makeDeps({
      getEdgesForAccount: vi.fn().mockResolvedValue(edges),
    });
    const result = await getEdgesForAccount('acc-1', deps);
    expect(result).toEqual(edges);
    expect(deps.neptune.getEdgesForAccount).toHaveBeenCalledWith('acc-1');
  });

  it('returns empty array when no edges found', async () => {
    const deps = makeDeps();
    const result = await getEdgesForAccount('acc-1', deps);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cluster detection tests
// ---------------------------------------------------------------------------

describe('findCorrelatedCluster', () => {
  it('returns cluster when 3+ correlated accounts exist (including queried account)', async () => {
    const correlatedEdges: GraphEdge[] = [
      { label: 'CORRELATED_WITH', from: 'acc-1', to: 'acc-2', correlationType: 'shared_wallet', confidence: 0.9, detectedAt: '2024-01-01T00:00:00Z' },
      { label: 'CORRELATED_WITH', from: 'acc-1', to: 'acc-3', correlationType: 'shared_device', confidence: 0.85, detectedAt: '2024-01-01T00:00:00Z' },
    ];
    const deps = makeDeps({
      getCorrelatedAccounts: vi.fn().mockResolvedValue(['acc-2', 'acc-3']),
      getEdgesForAccount: vi.fn().mockResolvedValue(correlatedEdges),
    });

    const result = await findCorrelatedCluster('acc-1', deps);

    expect(result).not.toBeNull();
    expect(result!.accountIds).toEqual(['acc-1', 'acc-2', 'acc-3']);
    expect(result!.edges).toEqual(correlatedEdges);
  });

  it('returns null when fewer than 3 total accounts', async () => {
    const deps = makeDeps({
      getCorrelatedAccounts: vi.fn().mockResolvedValue(['acc-2']),
    });

    const result = await findCorrelatedCluster('acc-1', deps);

    expect(result).toBeNull();
  });

  it('returns null when no correlated accounts exist', async () => {
    const deps = makeDeps({
      getCorrelatedAccounts: vi.fn().mockResolvedValue([]),
    });

    const result = await findCorrelatedCluster('acc-1', deps);

    expect(result).toBeNull();
  });

  it('deduplicates account IDs when queried account appears in correlated list', async () => {
    const deps = makeDeps({
      getCorrelatedAccounts: vi.fn().mockResolvedValue(['acc-1', 'acc-2', 'acc-3']),
      getEdgesForAccount: vi.fn().mockResolvedValue([]),
    });

    const result = await findCorrelatedCluster('acc-1', deps);

    expect(result).not.toBeNull();
    expect(result!.accountIds).toEqual(['acc-1', 'acc-2', 'acc-3']);
  });

  it('returns cluster with exactly 3 accounts at the threshold', async () => {
    const deps = makeDeps({
      getCorrelatedAccounts: vi.fn().mockResolvedValue(['acc-2', 'acc-3']),
      getEdgesForAccount: vi.fn().mockResolvedValue([]),
    });

    const result = await findCorrelatedCluster('acc-1', deps);

    expect(result).not.toBeNull();
    expect(result!.accountIds).toHaveLength(3);
  });

  it('returns cluster with many correlated accounts', async () => {
    const manyAccounts = ['acc-2', 'acc-3', 'acc-4', 'acc-5', 'acc-6'];
    const deps = makeDeps({
      getCorrelatedAccounts: vi.fn().mockResolvedValue(manyAccounts),
      getEdgesForAccount: vi.fn().mockResolvedValue([]),
    });

    const result = await findCorrelatedCluster('acc-1', deps);

    expect(result).not.toBeNull();
    expect(result!.accountIds).toHaveLength(6);
    expect(result!.accountIds).toContain('acc-1');
    for (const id of manyAccounts) {
      expect(result!.accountIds).toContain(id);
    }
  });
});
