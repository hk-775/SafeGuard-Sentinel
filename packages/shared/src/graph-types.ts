// ---------------------------------------------------------------------------
// Neptune graph vertex types
// ---------------------------------------------------------------------------

export interface AccountVertex {
  accountId: string;
  createdAt: string; // ISO-8601
  deviceFingerprint: string;
  status: string;
}

export interface PhotoVertex {
  photoHash: string;
  sourceUrl: string;
}

export interface WalletAddressVertex {
  address: string;
  type: string; // e.g. 'bitcoin', 'ethereum'
}

export interface MessageTemplateVertex {
  templateHash: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Neptune graph edge types
// ---------------------------------------------------------------------------

/** Account → Photo */
export interface UsesPhotoEdge {
  label: 'USES_PHOTO';
  from: string; // accountId
  to: string; // photoHash
  uploadedAt: string; // ISO-8601
}

/** Account → WalletAddress */
export interface SharesWalletEdge {
  label: 'SHARES_WALLET';
  from: string; // accountId
  to: string; // wallet address
  detectedAt: string; // ISO-8601
}

/** Account → MessageTemplate */
export interface SendsTemplateEdge {
  label: 'SENDS_TEMPLATE';
  from: string; // accountId
  to: string; // templateHash
  sentAt: string; // ISO-8601
  recipientCount: number;
}

/** Account → Account (behavioural / signal correlation) */
export interface CorrelatedWithEdge {
  label: 'CORRELATED_WITH';
  from: string; // accountId
  to: string; // accountId
  correlationType: string;
  confidence: number; // 0-1
  detectedAt: string; // ISO-8601
}

/** Account → Account (shared device fingerprint) */
export interface SameDeviceEdge {
  label: 'SAME_DEVICE';
  from: string; // accountId
  to: string; // accountId
  deviceFingerprint: string;
}

/** Union of all edge types for convenience. */
export type GraphEdge =
  | UsesPhotoEdge
  | SharesWalletEdge
  | SendsTemplateEdge
  | CorrelatedWithEdge
  | SameDeviceEdge;

/** Union of all vertex types for convenience. */
export type GraphVertex =
  | AccountVertex
  | PhotoVertex
  | WalletAddressVertex
  | MessageTemplateVertex;
