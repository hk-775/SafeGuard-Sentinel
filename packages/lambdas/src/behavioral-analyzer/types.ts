/** Interaction record stored in DynamoDB session table. */
export interface InteractionRecord {
  userId: string;
  targetId: string;
  interactionType: 'message' | 'interaction' | 'connection';
  timestamp: string; // ISO-8601
}

/** Sliding window counter for velocity tracking. */
export interface VelocityWindow {
  userId: string;
  distinctRecipients: string[];
  windowStart: string; // ISO-8601
  windowEnd: string; // ISO-8601
}

/** Connection acceptance record for connection anomaly detection. */
export interface ConnectionRecord {
  userId: string;
  connectedUserId: string;
  accepted: boolean;
  connectedAccountCreatedAt: string; // ISO-8601
  timestamp: string; // ISO-8601
}

/** Account clustering result from Neptune graph queries. */
export interface ClusterResult {
  clusterIds: string[];
  correlationType: 'shared_device' | 'simultaneous_creation' | 'overlapping_behavior';
  confidence: number; // 0-1
}

// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

/** Abstraction over DynamoDB session table for interaction tracking. */
export interface SessionStore {
  recordInteraction(record: InteractionRecord): Promise<void>;
  getDistinctRecipientsInWindow(userId: string, windowStart: string, windowEnd: string): Promise<string[]>;
  getRecentConnections(userId: string, windowHours: number): Promise<ConnectionRecord[]>;
}

/** Abstraction over Amazon Neptune for graph queries. */
export interface NeptuneClient {
  findClustersByAccount(accountId: string): Promise<ClusterResult[]>;
}

/** Abstraction over EventBridge for publishing analyzer output. */
export interface EventBridgeClient {
  publish(event: Record<string, unknown>): Promise<void>;
}

/** Dependencies injected into the behavioral analyzer handler. */
export interface BehavioralAnalyzerDeps {
  sessionStore: SessionStore;
  neptune: NeptuneClient;
  eventBridge: EventBridgeClient;
}
