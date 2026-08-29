import { randomUUID } from 'crypto';
import {
  AppealStatus,
  APPEAL_RESOLUTION_SLA_HOURS,
  AUDIT_RETENTION_MONTHS,
} from '@safeguard-sentinel/shared';
import type { SubmitAppealRequest, SubmitAppealResult, SubmitAppealDeps } from './types';

/**
 * Submits a new appeal against an automated intervention.
 *
 * - Generates a unique appealId
 * - Acknowledges receipt immediately (within 5-minute SLA)
 * - Sets SLA deadline to 24 hours from submission
 * - Creates the appeal record in the store
 * - Routes the appeal to the Human Escalation Queue
 * - Computes TTL using 12-month audit retention
 *
 * Validates: Requirements 20.1, 20.2
 */
export async function submitAppeal(
  request: SubmitAppealRequest,
  deps: SubmitAppealDeps,
): Promise<SubmitAppealResult> {
  const appealId = randomUUID();
  const now = new Date();
  const acknowledgedAt = now.toISOString();

  const slaDeadline = new Date(now.getTime() + APPEAL_RESOLUTION_SLA_HOURS * 60 * 60 * 1000);
  const ttl = Math.floor(now.getTime() / 1000) + AUDIT_RETENTION_MONTHS * 30 * 24 * 60 * 60;

  await deps.appealStore.createAppeal({
    appealId,
    userId: request.userId,
    interventionId: request.interventionId,
    submittedAt: acknowledgedAt,
    acknowledgedAt,
    status: AppealStatus.Acknowledged,
    resolution: null,
    resolvedAt: null,
    resolvedBy: null,
    originalEvidencePackageId: request.originalEvidencePackageId,
    slaDeadline: slaDeadline.toISOString(),
    ttl,
  });

  await deps.escalationClient.routeAppeal({
    appealId,
    userId: request.userId,
    interventionId: request.interventionId,
    evidencePackageId: request.originalEvidencePackageId,
  });

  return {
    appealId,
    acknowledgedAt,
    slaDeadline: slaDeadline.toISOString(),
    status: AppealStatus.Acknowledged,
  };
}
