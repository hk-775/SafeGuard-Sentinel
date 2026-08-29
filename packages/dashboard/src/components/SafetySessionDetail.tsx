import type { SafetySession, CheckIn, Signal } from '../types';

export interface FormattedCheckIn {
  promptedAt: string;
  respondedAt: string;
  response: string;
}

export interface FormattedContactRiskSummary {
  compositeScore: number;
  flaggedSignals: Signal[];
}

export interface FormattedSafetySessionDetail {
  sessionId: string;
  contactRiskSummary: FormattedContactRiskSummary;
  checkInHistory: FormattedCheckIn[];
  lastKnownLocationRef: string | null;
  emergencyContactRefs: string[];
}

/**
 * Pure function that formats a SafetySession for the detail view,
 * including contact risk, check-in history, and opaque notification
 * references. It never formats raw contact details or coordinates.
 */
export function formatSafetySessionDetail(session: SafetySession): FormattedSafetySessionDetail {
  return {
    sessionId: session.sessionId,
    contactRiskSummary: {
      compositeScore: session.contactRiskSummary.compositeScore,
      flaggedSignals: session.contactRiskSummary.flaggedSignals,
    },
    checkInHistory: session.checkIns.map((checkIn: CheckIn) => ({
      promptedAt: checkIn.promptedAt,
      respondedAt: checkIn.respondedAt ?? 'N/A',
      response: checkIn.response ?? 'N/A',
    })),
    lastKnownLocationRef: session.lastKnownLocationRef,
    emergencyContactRefs: session.emergencyContactRefs,
  };
}
