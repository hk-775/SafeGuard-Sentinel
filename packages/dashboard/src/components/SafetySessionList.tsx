import type { SafetySession, SafetySessionStatusIndicator } from '../types';
import { getSafetySessionStatusIndicator } from '../utils/safety-session-status';

export interface FormattedSafetySessionRow {
  sessionId: string;
  userId: string;
  contactId: string;
  locationName: string;
  locationVerified: boolean;
  status: string;
  missedConsecutiveCheckIns: number;
  startedAt: string;
  statusIndicator: SafetySessionStatusIndicator;
}

/**
 * Pure function that formats a SafetySession for display in the session list.
 * Applies status indicator via getSafetySessionStatusIndicator.
 */
export function formatSafetySessionRow(session: SafetySession): FormattedSafetySessionRow {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    contactId: session.contactId,
    locationName: session.meetingLocation.label,
    locationVerified: session.meetingLocation.verified,
    status: session.status,
    missedConsecutiveCheckIns: session.missedConsecutiveCheckIns,
    startedAt: session.startedAt,
    statusIndicator: getSafetySessionStatusIndicator(session.status, session.missedConsecutiveCheckIns),
  };
}
