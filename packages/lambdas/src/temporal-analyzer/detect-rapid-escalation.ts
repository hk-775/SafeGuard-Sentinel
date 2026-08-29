import { ESCALATION_WINDOW_MINUTES } from '@safeguard-sentinel/shared';
import type { EscalationTracker } from './types';

/** Result of rapid escalation detection. */
export interface RapidEscalationResult {
  /** Whether rapid escalation was detected. */
  isRapidEscalation: boolean;
  /** Elapsed minutes from connection to contact request, if applicable. */
  elapsedMinutes: number | null;
  /** The threshold in minutes used for detection. */
  thresholdMinutes: number;
}

/**
 * Tracks progression from connection creation to personal contact request.
 * Flags the session if the elapsed time is less than 15 minutes.
 */
export async function detectRapidEscalation(
  sessionId: string,
  escalationTracker: EscalationTracker,
): Promise<RapidEscalationResult> {
  const connectionTimestamp =
    await escalationTracker.getConnectionTimestamp(sessionId);
  const contactRequestTimestamp = await escalationTracker.getContactRequestTimestamp(sessionId);

  if (!connectionTimestamp || !contactRequestTimestamp) {
    return {
      isRapidEscalation: false,
      elapsedMinutes: null,
      thresholdMinutes: ESCALATION_WINDOW_MINUTES,
    };
  }

  const connectionTime = new Date(connectionTimestamp).getTime();
  const contactTime = new Date(contactRequestTimestamp).getTime();
  const elapsedMinutes = (contactTime - connectionTime) / (60 * 1000);

  return {
    isRapidEscalation: elapsedMinutes < ESCALATION_WINDOW_MINUTES,
    elapsedMinutes,
    thresholdMinutes: ESCALATION_WINDOW_MINUTES,
  };
}
