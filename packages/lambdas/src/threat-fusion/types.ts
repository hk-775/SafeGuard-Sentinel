import type { CompositeThreatScoreRecord, AnalyzerOutputEvent, ScoreWeights } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

/** Abstraction over DynamoDB for session/score state. */
export interface SessionStateStore {
  getScoreRecord(sessionId: string): Promise<CompositeThreatScoreRecord | null>;
  putScoreRecord(record: CompositeThreatScoreRecord): Promise<void>;
}

/** Abstraction over Amazon Neptune for graph queries. */
export interface NeptuneGraphClient {
  findCorrelatedAccounts(accountId: string): Promise<string[]>;
}

/** Abstraction over EventBridge for publishing threat events. */
export interface ThreatEventBridgeClient {
  publish(event: Record<string, unknown>): Promise<void>;
}

/** Dependencies injected into the threat fusion handler. */
export interface ThreatFusionDeps {
  sessionStateStore: SessionStateStore;
  neptune: NeptuneGraphClient;
  eventBridge: ThreatEventBridgeClient;
}

/** Input shape for the composite score computation. */
export interface CompositeScoreInput {
  visualScore: number;
  textualScore: number;
  behavioralScore: number;
  temporalScore: number;
  weights: ScoreWeights;
}

/** Result from the degraded scoring check. */
export interface DegradedResult {
  degraded: boolean;
  degradedAnalyzers: string[];
  availableScores: Partial<Record<'visual' | 'textual' | 'behavioral' | 'temporal', number>>;
}

/** Result from the network graph query. */
export interface NetworkQueryResult {
  correlatedAccounts: string[];
  correlationCount: number;
}
