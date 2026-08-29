import {
  AppealResolution,
  AppealStatus,
  CheckInResponse,
  EventType,
  InterventionLevel,
  InterventionOutcome,
  InterventionType,
  SignalSeverity,
  SafetySessionStatus,
} from './enums';

// ---------------------------------------------------------------------------
// Signal & Analyzer types
// ---------------------------------------------------------------------------

/** Individual signal detected by an analyzer. */
export interface Signal {
  signalType: string;
  severity: SignalSeverity;
  details: Record<string, unknown>;
  timestamp: string; // ISO-8601
}

/** Standardised platform event envelope (Kinesis / EventBridge). */
export interface SignalEvent {
  eventId: string; // UUID
  eventType: EventType;
  sessionId: string;
  userId: string;
  timestamp: string; // ISO-8601
  geoRegion: string;
  deviceFingerprint: string;
  payload: Record<string, unknown>;
}

/** Output published by each signal analyzer to EventBridge. */
export interface AnalyzerOutputEvent {
  analyzerId: 'visual' | 'textual' | 'behavioral' | 'temporal';
  sessionId: string;
  userId: string;
  score: number; // 0-100
  confidence: number; // 0-1
  signals: Signal[];
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Threat Fusion types
// ---------------------------------------------------------------------------

/** Per-domain weight configuration. */
export interface ScoreWeights {
  visual: number;
  textual: number;
  behavioral: number;
  temporal: number;
}

/** Composite threat score record stored in DynamoDB. */
export interface CompositeThreatScoreRecord {
  sessionId: string; // PK
  userId: string; // GSI-PK
  compositeScore: number; // 0-100
  visualScore: number; // 0-100
  textualScore: number; // 0-100
  behavioralScore: number; // 0-100
  temporalScore: number; // 0-100
  weights: ScoreWeights;
  degraded: boolean;
  degradedAnalyzers: string[];
  activeInterventionLevel: InterventionLevel;
  lastUpdated: string; // ISO-8601
  ttl: number; // epoch seconds
}

// ---------------------------------------------------------------------------
// Intervention types
// ---------------------------------------------------------------------------

/** Signal breakdown stored alongside interventions and evidence. */
export interface SignalBreakdown {
  visual: number;
  textual: number;
  behavioral: number;
  temporal: number;
}

/** Intervention log entry stored in OpenSearch. */
export interface InterventionLog {
  interventionId: string; // UUID
  timestamp: string; // ISO-8601
  interventionLevel: InterventionLevel;
  interventionType: InterventionType;
  targetAccounts: string[];
  triggeringScore: number;
  signalBreakdown: SignalBreakdown;
  actionTaken: string;
  outcome: InterventionOutcome;
  humanReviewRequired: boolean;
  escalationQueueId: string | null;
}

// ---------------------------------------------------------------------------
// Evidence types
// ---------------------------------------------------------------------------

/** A single message in conversation history. */
export interface ConversationMessage {
  messageId: string;
  senderId: string;
  content: string;
  timestamp: string; // ISO-8601
}

/** Chain-of-custody metadata for tamper-evident evidence. */
export interface ChainOfCustody {
  createdBy: string;
  createdAt: string; // ISO-8601
  checksumSHA256: string;
  s3ObjectLockRetainUntil: string; // ISO-8601
}

/** Per-domain signal breakdown within an evidence package. */
export interface EvidenceSignalBreakdown {
  visual: { score: number; signals: Signal[] };
  textual: { score: number; signals: Signal[] };
  behavioral: { score: number; signals: Signal[] };
  temporal: { score: number; signals: Signal[] };
}

/** Evidence package stored in S3. */
export interface EvidencePackage {
  packageId: string; // UUID
  caseId: string;
  createdAt: string; // ISO-8601
  targetAccounts: string[];
  interventionLevel: InterventionLevel;
  compositeScoreAtIntervention: number;
  signalBreakdown: EvidenceSignalBreakdown;
  conversationHistory: ConversationMessage[];
  photoMetadata: Record<string, unknown>[];
  behavioralTimeline: Record<string, unknown>[];
  crossReferences: Record<string, unknown>[];
  networkGraph: {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
  };
  chainOfCustody: ChainOfCustody;
  aiResponseDrafts: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Safety session types
// ---------------------------------------------------------------------------

/**
 * Privacy-preserving meeting-location metadata.
 *
 * Implementations should resolve `locationRef` at runtime through an approved
 * location provider. Precise coordinates and street addresses are deliberately
 * excluded from the shared event contract.
 */
export interface MeetingLocation {
  label: string;
  verified: boolean;
  locationRef: string;
}

/** A single check-in within a safety session. */
export interface CheckIn {
  promptedAt: string; // ISO-8601
  respondedAt: string | null; // ISO-8601
  response: CheckInResponse | null;
}

/** Risk summary for the contact associated with a safety session. */
export interface ContactRiskSummary {
  compositeScore: number;
  flaggedSignals: Signal[];
}

/** Safety session record stored in DynamoDB. */
export interface SafetySession {
  sessionId: string; // PK
  userId: string; // GSI-PK
  contactId: string;
  contactRiskSummary: ContactRiskSummary;
  meetingLocation: MeetingLocation;
  status: SafetySessionStatus;
  checkIns: CheckIn[];
  missedConsecutiveCheckIns: number;
  emergencyContactRefs: string[];
  lastKnownLocationRef: string | null;
  startedAt: string; // ISO-8601
  ttl: number; // epoch seconds
}

// ---------------------------------------------------------------------------
// Appeal types
// ---------------------------------------------------------------------------

/** Appeal record stored in DynamoDB. */
export interface AppealRecord {
  appealId: string; // PK
  userId: string; // GSI-PK
  interventionId: string; // GSI-PK
  submittedAt: string; // ISO-8601
  acknowledgedAt: string; // ISO-8601
  status: AppealStatus;
  resolution: AppealResolution | null;
  resolvedAt: string | null; // ISO-8601
  resolvedBy: string | null;
  originalEvidencePackageId: string;
  slaDeadline: string; // ISO-8601
  ttl: number; // epoch seconds
}
