import type { InterventionLevel } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Dashboard module — injectable interfaces
// ---------------------------------------------------------------------------

/** Manages WebSocket connection IDs for real-time dashboard streaming. */
export interface WebSocketConnectionStore {
  addConnection(connectionId: string): Promise<void>;
  removeConnection(connectionId: string): Promise<void>;
  getConnections(): Promise<string[]>;
}

/** Posts data to connected WebSocket clients via API Gateway Management API. */
export interface WebSocketApiClient {
  postToConnection(connectionId: string, data: string): Promise<void>;
}

/** Retrieves aggregate metrics and active intervention data for the dashboard. */
export interface MetricsStore {
  getAggregateMetrics(): Promise<AggregateMetrics>;
  getActiveInterventions(): Promise<ActiveIntervention[]>;
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** Summary metrics displayed on the monitoring dashboard. */
export interface AggregateMetrics {
  threatsNeutralized: number;
  avgResponseTimeMs: number;
  falsePositiveRate: number;
  networksDisrupted: number;
  photosAnalyzed: number;
  messagesScanned: number;
  behavioralSessions: number;
  temporalEvaluations: number;
  activeSafetySessions: number;
}

/** An active intervention card displayed on the dashboard. */
export interface ActiveIntervention {
  interventionId: string;
  threatType: string;
  compositeScore: number;
  interventionLevel: InterventionLevel;
  status: string;
}

/** A real-time event pushed to connected dashboards. */
export interface DashboardEvent {
  type: 'threat' | 'intervention' | 'resolution' | 'metric';
  payload: Record<string, unknown>;
  timestamp: string;
}

/** Color codes applied to dashboard elements based on threat level. */
export type DashboardColorCode = 'green' | 'amber' | 'red';

// ---------------------------------------------------------------------------
// Dependency containers
// ---------------------------------------------------------------------------

/** Dependencies for streaming metrics to connected dashboards. */
export interface StreamMetricsDeps {
  connectionStore: WebSocketConnectionStore;
  wsClient: WebSocketApiClient;
}

/** Dependencies for retrieving dashboard metrics. */
export interface GetMetricsDeps {
  metricsStore: MetricsStore;
}
