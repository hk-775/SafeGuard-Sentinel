import type { ConversationMessage } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Evidence module — injectable interfaces
// ---------------------------------------------------------------------------

/** Retrieves conversation history for a session and set of target accounts. */
export interface ConversationHistoryClient {
  getHistory(sessionId: string, targetAccounts: string[]): Promise<ConversationMessage[]>;
}

/** Retrieves photo metadata for the target accounts. */
export interface PhotoMetadataClient {
  getMetadata(targetAccounts: string[]): Promise<Record<string, unknown>[]>;
}

/** Retrieves the behavioral timeline for a user session. */
export interface BehavioralTimelineClient {
  getTimeline(sessionId: string, userId: string): Promise<Record<string, unknown>[]>;
}

/** Retrieves cross-reference reports for the target accounts. */
export interface CrossReferenceClient {
  getCrossReferences(targetAccounts: string[]): Promise<Record<string, unknown>[]>;
}

/** Retrieves the scam network graph for the target accounts. */
export interface NetworkGraphClient {
  getNetworkGraph(
    targetAccounts: string[],
  ): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }>;
}

/** Retrieves AI-generated response drafts for a session. */
export interface AIResponseDraftClient {
  getDrafts(sessionId: string): Promise<Record<string, unknown>[]>;
}

/** Retrieves the threat score record for a session. */
export interface ThreatScoreClient {
  getScoreRecord(
    sessionId: string,
  ): Promise<{
    compositeScore: number;
    visualScore: number;
    textualScore: number;
    behavioralScore: number;
    temporalScore: number;
  } | null>;
}

// ---------------------------------------------------------------------------
// S3 evidence storage — injectable interfaces
// ---------------------------------------------------------------------------

/** Minimal S3 client for writing evidence objects. */
export interface S3EvidenceClient {
  putObject(params: {
    bucket: string;
    key: string;
    body: string;
    checksumSHA256: string;
    sseKmsKeyId: string;
    objectLockMode: string;
    objectLockRetainUntilDate: string;
  }): Promise<void>;
}

/** Dependencies injected into the storeEvidence function. */
export interface StoreEvidenceDeps {
  s3Client: S3EvidenceClient;
  bucketName: string;
  kmsKeyId: string;
}

// ---------------------------------------------------------------------------
// S3 pre-signed URL generation — injectable interfaces
// ---------------------------------------------------------------------------

/** Minimal client for generating pre-signed S3 URLs. */
export interface S3PresignClient {
  generatePresignedUrl(params: {
    bucket: string;
    key: string;
    expiresInSeconds: number;
  }): Promise<string>;
}

/** Client for logging evidence access events. */
export interface AccessLogClient {
  logAccess(params: {
    packageId: string;
    requestedBy: string;
    purpose: string;
    objectKey: string;
    expiresAt: string;
    timestamp: string;
  }): Promise<void>;
}

/** Dependencies injected into the transferEvidence function. */
export interface TransferEvidenceDeps {
  presignClient: S3PresignClient;
  accessLog: AccessLogClient;
  bucketName: string;
}

// ---------------------------------------------------------------------------
// S3 Lifecycle configuration — injectable interfaces
// ---------------------------------------------------------------------------

/** A single S3 lifecycle transition rule. */
export interface LifecycleRule {
  id: string;
  prefix: string;
  status: 'Enabled' | 'Disabled';
  transitions: { days: number; storageClass: string }[];
}

/** Minimal S3 client for configuring lifecycle rules. */
export interface S3LifecycleClient {
  putLifecycleConfiguration(params: {
    bucket: string;
    rules: LifecycleRule[];
  }): Promise<void>;
}

/** Dependencies injected into the configureArchivalLifecycle function. */
export interface ArchivalLifecycleDeps {
  s3Client: S3LifecycleClient;
  bucketName: string;
}

// ---------------------------------------------------------------------------
// Aggregated dependency container
// ---------------------------------------------------------------------------

/** All dependencies injected into the evidence assembly function. */
export interface AssembleEvidenceDeps {
  conversationHistory: ConversationHistoryClient;
  photoMetadata: PhotoMetadataClient;
  behavioralTimeline: BehavioralTimelineClient;
  crossReference: CrossReferenceClient;
  networkGraph: NetworkGraphClient;
  aiResponseDraft: AIResponseDraftClient;
  threatScore: ThreatScoreClient;
}
