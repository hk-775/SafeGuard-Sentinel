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
  GraphVertex,
} from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Query result types
// ---------------------------------------------------------------------------

/** A cluster of correlated accounts detected in the graph. */
export interface AccountCluster {
  accountIds: string[];
  edges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Injectable Neptune client interface
// ---------------------------------------------------------------------------

/** Abstraction over Amazon Neptune for scam network graph operations. */
export interface ScamNetworkNeptuneClient {
  // Vertex operations
  addAccountVertex(vertex: AccountVertex): Promise<void>;
  addPhotoVertex(vertex: PhotoVertex): Promise<void>;
  addWalletAddressVertex(vertex: WalletAddressVertex): Promise<void>;
  addMessageTemplateVertex(vertex: MessageTemplateVertex): Promise<void>;

  // Edge operations
  addUsesPhotoEdge(edge: UsesPhotoEdge): Promise<void>;
  addSharesWalletEdge(edge: SharesWalletEdge): Promise<void>;
  addSendsTemplateEdge(edge: SendsTemplateEdge): Promise<void>;
  addCorrelatedWithEdge(edge: CorrelatedWithEdge): Promise<void>;
  addSameDeviceEdge(edge: SameDeviceEdge): Promise<void>;

  // Query operations
  getAccountVertex(accountId: string): Promise<AccountVertex | null>;
  getEdgesForAccount(accountId: string): Promise<GraphEdge[]>;
  getCorrelatedAccounts(accountId: string): Promise<string[]>;
}

/** Dependencies injected into scam network graph access functions. */
export interface ScamNetworkDeps {
  neptune: ScamNetworkNeptuneClient;
}
