import type { RapidResponseResult } from '../types';

export interface FormattedIncidentDetail {
  evidencePackageId: string;
  victimCount: number;
  outreachInitiated: boolean;
  routedToSpecialist: string;
}

/**
 * Pure function that formats a RapidResponseResult for the incident detail view.
 */
export function formatIncidentDetail(result: RapidResponseResult): FormattedIncidentDetail {
  return {
    evidencePackageId: result.evidencePackageId,
    victimCount: result.victimCount,
    outreachInitiated: result.outreachInitiated,
    routedToSpecialist: result.routedToSpecialist,
  };
}
