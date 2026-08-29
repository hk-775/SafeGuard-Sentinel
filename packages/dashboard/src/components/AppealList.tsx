import type { AppealRecord, SlaStatus } from '../types';
import { AppealResolution } from '../types';
import { getAppealSlaStatus } from '../utils/appeal-sla';

export interface FormattedAppealRow {
  appealId: string;
  userId: string;
  interventionId: string;
  submittedAt: string;
  acknowledgedAt: string;
  status: string;
  resolution: string;
  slaDeadline: string;
  slaIndicator: SlaStatus;
}

/**
 * Pure function that formats an AppealRecord for display in the appeal list.
 * Applies SLA indicator via getAppealSlaStatus.
 */
export function formatAppealRow(appeal: AppealRecord, now: Date): FormattedAppealRow {
  return {
    appealId: appeal.appealId,
    userId: appeal.userId,
    interventionId: appeal.interventionId,
    submittedAt: appeal.submittedAt,
    acknowledgedAt: appeal.acknowledgedAt,
    status: appeal.status,
    resolution: appeal.resolution ?? 'N/A',
    slaDeadline: appeal.slaDeadline,
    slaIndicator: getAppealSlaStatus(appeal.slaDeadline, now),
  };
}
