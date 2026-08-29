import type { AuditLogEntry } from '../types';
import { InterventionLevel } from '../types';

export interface FormattedAuditLogRow {
  interventionId: string;
  timestamp: string;
  interventionLevel: string;
  interventionType: string;
  targetAccounts: string;
  triggeringScore: number;
  actionTaken: string;
  outcome: string;
  humanReviewRequired: boolean;
}

const INTERVENTION_LEVEL_NAMES: Record<InterventionLevel, string> = {
  [InterventionLevel.None]: 'None',
  [InterventionLevel.SafetyPrompt]: 'SafetyPrompt',
  [InterventionLevel.Friction]: 'Friction',
  [InterventionLevel.InteractionRestriction]: 'Interaction Restriction',
  [InterventionLevel.NetworkDisruption]: 'NetworkDisruption',
};

/**
 * Pure function that formats an AuditLogEntry into a row with all required columns.
 */
export function formatAuditLogRow(entry: AuditLogEntry): FormattedAuditLogRow {
  return {
    interventionId: entry.interventionId,
    timestamp: entry.timestamp,
    interventionLevel: INTERVENTION_LEVEL_NAMES[entry.interventionLevel] ?? 'Unknown',
    interventionType: entry.interventionType,
    targetAccounts: entry.targetAccounts.join(', '),
    triggeringScore: entry.triggeringScore,
    actionTaken: entry.actionTaken,
    outcome: entry.outcome,
    humanReviewRequired: entry.humanReviewRequired,
  };
}
