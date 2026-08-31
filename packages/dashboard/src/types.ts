// Dashboard-specific types
// Re-exports from shared and lambdas dashboard types are inlined here
// to avoid cross-package import issues with the lambdas package.

import type { InterventionLevel } from '@safeguard-sentinel/shared';

// Re-export shared types used across the dashboard
export type {
  AppealRecord,
  ChainOfCustody,
  ConversationMessage,
  EvidencePackage,
  EvidenceSignalBreakdown,
  SafetySession,
  Signal,
  SignalBreakdown,
  ContactRiskSummary,
  CheckIn,
  MeetingLocation,
  InterventionLog,
} from '@safeguard-sentinel/shared';

export {
  AppealStatus,
  AppealResolution,
  CheckInResponse,
  InterventionLevel,
  InterventionOutcome,
  InterventionType,
  SafetySessionStatus,
  SignalSeverity,
} from '@safeguard-sentinel/shared';

// --- Dashboard-specific types (mirrored from lambdas/dashboard/types) ---

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

export interface ActiveIntervention {
  interventionId: string;
  threatType: string;
  compositeScore: number;
  interventionLevel: InterventionLevel;
  status: string;
}

export interface DashboardEvent {
  type: 'threat' | 'intervention' | 'resolution' | 'metric';
  payload: Record<string, unknown>;
  timestamp: string;
}

export type DashboardColorCode = 'green' | 'amber' | 'red';

// --- API Client types ---

export interface ApiClientConfig {
  baseUrl: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
}

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

// --- SLA types ---

export type SlaStatus = 'ok' | 'warning' | 'breached';

// --- WebSocket types ---

export interface ReconnectionState {
  attempt: number;
  nextBackoffMs: number;
  status: 'connected' | 'disconnected' | 'reconnecting';
}

export interface WebSocketManagerConfig {
  url: string;
  disabled?: boolean;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

// --- Audit types (mirrored from lambdas) ---

export interface AuditLogEntry {
  interventionId: string;
  timestamp: string;
  interventionLevel: InterventionLevel;
  interventionType: string;
  targetAccounts: string[];
  triggeringScore: number;
  actionTaken: string;
  outcome: string;
  humanReviewRequired: boolean;
}

export interface AuditSearchFilters {
  dateFrom?: string;
  dateTo?: string;
  interventionLevel?: InterventionLevel;
  accountId?: string;
  threatType?: string;
  query?: string;
}

// --- Rapid Response types (mirrored from lambdas) ---

export interface IncidentReport {
  reportId: string;
  sessionId: string;
  userId: string;
  incidentType: 'fraud' | 'harassment' | 'physical_safety';
  timestamp: string;
}

export interface RapidResponseResult {
  evidencePackageId: string;
  victimCount: number;
  outreachInitiated: boolean;
  routedToSpecialist: string;
}

// --- Graph types (mirrored from lambdas) ---

export interface GraphVertex {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  properties: Record<string, unknown>;
}

export type SlaHealthIndicator = 'green' | 'red';

export type SafetySessionStatusIndicator = 'red' | 'amber' | 'default';

export interface EdgeStyle {
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}
