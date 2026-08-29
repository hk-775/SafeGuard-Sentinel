import type { AppealRecord } from '../types';

export interface FormattedAppealDetail {
  appealId: string;
  userId: string;
  interventionId: string;
  submittedAt: string;
  acknowledgedAt: string;
  status: string;
  resolution: string;
  resolvedAt: string;
  resolvedBy: string;
  originalEvidencePackageId: string;
  slaDeadline: string;
}

/**
 * Pure function that formats an AppealRecord for the detail view,
 * including the linked evidence package ID and resolution history.
 */
export function formatAppealDetail(appeal: AppealRecord): FormattedAppealDetail {
  return {
    appealId: appeal.appealId,
    userId: appeal.userId,
    interventionId: appeal.interventionId,
    submittedAt: appeal.submittedAt,
    acknowledgedAt: appeal.acknowledgedAt,
    status: appeal.status,
    resolution: appeal.resolution ?? 'N/A',
    resolvedAt: appeal.resolvedAt ?? 'N/A',
    resolvedBy: appeal.resolvedBy ?? 'N/A',
    originalEvidencePackageId: appeal.originalEvidencePackageId,
    slaDeadline: appeal.slaDeadline,
  };
}
