import type { ActiveIntervention, DashboardColorCode } from '../types';
import { InterventionLevel } from '../types';
import { getColorCode } from '../utils/color-code';

export interface FormattedThreatCard {
  interventionId: string;
  threatType: string;
  compositeScore: number;
  compositeScoreColorCode: DashboardColorCode;
  interventionLevelName: string;
  status: string;
}

const INTERVENTION_LEVEL_NAMES: Record<InterventionLevel, string> = {
  [InterventionLevel.None]: 'None',
  [InterventionLevel.SafetyPrompt]: 'SafetyPrompt',
  [InterventionLevel.Friction]: 'Friction',
  [InterventionLevel.InteractionRestriction]: 'Interaction Restriction',
  [InterventionLevel.NetworkDisruption]: 'NetworkDisruption',
};

/**
 * Pure function that formats an ActiveIntervention for display.
 * Applies color code to composite score via getColorCode.
 */
export function formatThreatCard(intervention: ActiveIntervention): FormattedThreatCard {
  return {
    interventionId: intervention.interventionId,
    threatType: intervention.threatType,
    compositeScore: intervention.compositeScore,
    compositeScoreColorCode: getColorCode(intervention.compositeScore),
    interventionLevelName: INTERVENTION_LEVEL_NAMES[intervention.interventionLevel] ?? 'Unknown',
    status: intervention.status,
  };
}
