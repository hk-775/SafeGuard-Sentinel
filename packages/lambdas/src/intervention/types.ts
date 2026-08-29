import type {
  CompositeThreatScoreRecord,
  InterventionLevel,
  InterventionType,
} from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Threat event input (received from EventBridge)
// ---------------------------------------------------------------------------

/** Input to the intervention workflow — a threat event emitted by the Threat Fusion Engine. */
export interface ThreatEvent {
  sessionId: string;
  userId: string;
  compositeScore: number;
  visualScore: number;
  textualScore: number;
  behavioralScore: number;
  temporalScore: number;
  correlatedAccounts: string[];
  /** Dominant threat signals used for prompt selection. */
  threatSignals: string[];
  /**
   * Opaque reference to a separately recorded human approval decision.
   * Required for Level 3 and Level 4 execution.
   */
  approvalReference?: string;
}

export type InterventionApprovalStatus = 'not_required' | 'required' | 'verified';

/** Result returned by the intervention handler. */
export interface InterventionResult {
  interventionLevel: InterventionLevel;
  interventionType: InterventionType | null;
  sessionId: string;
  userId: string;
  executed: boolean;
  approvalStatus: InterventionApprovalStatus;
}

// ---------------------------------------------------------------------------
// Injectable service interfaces
// ---------------------------------------------------------------------------

/** Level 1 — injects contextual safety prompts into conversations. */
export interface SafetyPromptService {
  injectPrompt(userId: string, sessionId: string, threatSignals: string[]): Promise<void>;
}

/** Level 2 — introduces message delivery delays / verification steps. */
export interface FrictionService {
  deployFriction(userId: string, sessionId: string): Promise<void>;
}

/** Level 3 — applies match restrictions and generates evidence. */
export interface AccountSuspensionService {
  suspendAccount(userId: string, sessionId: string): Promise<void>;
}

/** Level 4 — disables all correlated accounts simultaneously. */
export interface NetworkDisruptionService {
  disruptNetwork(accountIds: string[]): Promise<void>;
}

/** Sends user-facing notifications about interventions. */
export interface NotificationService {
  notifyUser(userId: string, interventionType: InterventionType, reason: string): Promise<void>;
}

/** Assembles and stores evidence packages. */
export interface EvidenceService {
  assembleEvidencePackage(sessionId: string, userId: string, correlatedAccounts: string[]): Promise<void>;
}

/** Routes cases to the human escalation queue. */
export interface EscalationQueueService {
  enqueue(sessionId: string, userId: string, reason: string): Promise<void>;
}

/** Verifies that an independent human approval is valid and bound to this action. */
export interface HumanApprovalGateService {
  verifyApproval(params: {
    approvalReference: string;
    sessionId: string;
    userId: string;
    interventionLevel: InterventionLevel;
    interventionType: InterventionType;
    targetAccountIds: string[];
  }): Promise<boolean>;
}

/** Logs every intervention for audit purposes. */
export interface AuditLogService {
  logIntervention(entry: {
    sessionId: string;
    userId: string;
    interventionLevel: InterventionLevel;
    interventionType: InterventionType | null;
    compositeScore: number;
    visualScore: number;
    textualScore: number;
    behavioralScore: number;
    temporalScore: number;
    executed: boolean;
    approvalStatus: InterventionApprovalStatus;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Aggregated dependency container
// ---------------------------------------------------------------------------

/** All dependencies injected into the intervention handler. */
export interface InterventionDeps {
  safetyPrompt: SafetyPromptService;
  friction: FrictionService;
  accountSuspension: AccountSuspensionService;
  networkDisruption: NetworkDisruptionService;
  notification: NotificationService;
  evidence: EvidenceService;
  escalationQueue: EscalationQueueService;
  approvalGate: HumanApprovalGateService;
  auditLog: AuditLogService;
}
