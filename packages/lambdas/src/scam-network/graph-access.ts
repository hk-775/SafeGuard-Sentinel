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
import { NETWORK_DISRUPTION_MIN_ACCOUNTS } from '@safeguard-sentinel/shared';

import type { ScamNetworkDeps, AccountCluster } from './types';

// ---------------------------------------------------------------------------
// Vertex operations
// ---------------------------------------------------------------------------

export async function addAccountVertex(
  vertex: AccountVertex,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addAccountVertex(vertex);
}

export async function addPhotoVertex(
  vertex: PhotoVertex,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addPhotoVertex(vertex);
}

export async function addWalletAddressVertex(
  vertex: WalletAddressVertex,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addWalletAddressVertex(vertex);
}

export async function addMessageTemplateVertex(
  vertex: MessageTemplateVertex,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addMessageTemplateVertex(vertex);
}

// ---------------------------------------------------------------------------
// Edge operations
// ---------------------------------------------------------------------------

export async function addUsesPhotoEdge(
  edge: UsesPhotoEdge,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addUsesPhotoEdge(edge);
}

export async function addSharesWalletEdge(
  edge: SharesWalletEdge,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addSharesWalletEdge(edge);
}

export async function addSendsTemplateEdge(
  edge: SendsTemplateEdge,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addSendsTemplateEdge(edge);
}

export async function addCorrelatedWithEdge(
  edge: CorrelatedWithEdge,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addCorrelatedWithEdge(edge);
}

export async function addSameDeviceEdge(
  edge: SameDeviceEdge,
  deps: ScamNetworkDeps,
): Promise<void> {
  await deps.neptune.addSameDeviceEdge(edge);
}

// ---------------------------------------------------------------------------
// Query operations
// ---------------------------------------------------------------------------

export async function getAccountVertex(
  accountId: string,
  deps: ScamNetworkDeps,
): Promise<AccountVertex | null> {
  return deps.neptune.getAccountVertex(accountId);
}

export async function getEdgesForAccount(
  accountId: string,
  deps: ScamNetworkDeps,
): Promise<GraphEdge[]> {
  return deps.neptune.getEdgesForAccount(accountId);
}

// ---------------------------------------------------------------------------
// Cluster detection
// ---------------------------------------------------------------------------

/**
 * Finds clusters of 3+ correlated accounts starting from a given account.
 *
 * Retrieves all correlated accounts from Neptune, then returns a cluster
 * only when the total group size (including the queried account) meets
 * the NETWORK_DISRUPTION_MIN_ACCOUNTS threshold.
 */
export async function findCorrelatedCluster(
  accountId: string,
  deps: ScamNetworkDeps,
): Promise<AccountCluster | null> {
  const correlatedIds = await deps.neptune.getCorrelatedAccounts(accountId);

  // The cluster includes the queried account plus all correlated accounts
  const allAccountIds = [accountId, ...correlatedIds];
  const uniqueAccountIds = Array.from(new Set(allAccountIds));

  if (uniqueAccountIds.length < NETWORK_DISRUPTION_MIN_ACCOUNTS) {
    return null;
  }

  const edges = await deps.neptune.getEdgesForAccount(accountId);

  return {
    accountIds: uniqueAccountIds,
    edges,
  };
}
