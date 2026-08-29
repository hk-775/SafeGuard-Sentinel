import type { AppealRecord, AppealResolution } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Appeal module — injectable interfaces and data types
// ---------------------------------------------------------------------------

/** Persistence layer for appeal records in DynamoDB. */
export interface AppealStore {
  createAppeal(appeal: AppealRecord): Promise<void>;
  getAppeal(appealId: string): Promise<AppealRecord | null>;
  updateAppeal(appealId: string, updates: Partial<AppealRecord>): Promise<void>;
}

/** Client for routing appeals to the Human Escalation Queue. */
export interface AppealEscalationClient {
  routeAppeal(params: {
    appealId: string;
    userId: string;
    interventionId: string;
    evidencePackageId: string;
  }): Promise<void>;
}

/** Input for submitting a new appeal. */
export interface SubmitAppealRequest {
  userId: string;
  interventionId: string;
  originalEvidencePackageId: string;
}

/** Result returned after successfully submitting an appeal. */
export interface SubmitAppealResult {
  appealId: string;
  acknowledgedAt: string;
  slaDeadline: string;
  status: import('@safeguard-sentinel/shared').AppealStatus;
}

/** Input for resolving an existing appeal. */
export interface ResolveAppealRequest {
  appealId: string;
  resolution: AppealResolution;
  resolvedBy: string;
}

/** Dependencies injected into the submitAppeal function. */
export interface SubmitAppealDeps {
  appealStore: AppealStore;
  escalationClient: AppealEscalationClient;
}

/** Dependencies injected into the resolveAppeal function. */
export interface ResolveAppealDeps {
  appealStore: AppealStore;
}
