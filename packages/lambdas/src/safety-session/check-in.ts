import {
  SafetySessionStatus,
  SAFETY_SESSION_MISSED_CHECKINS_ESCALATION,
} from '@safeguard-sentinel/shared';
import type { SafetySession } from '@safeguard-sentinel/shared';
import { CheckInResponse } from '@safeguard-sentinel/shared';
import type { CheckInDeps } from './types';

/**
 * Sends a proactive check-in prompt to the user for an active safety session.
 *
 * - No-op if session is not Active.
 * - Adds a new CheckIn entry (promptedAt = now, respondedAt = null, response = null).
 * - Increments missedConsecutiveCheckIns by 1.
 * - Escalates if missedConsecutiveCheckIns >= SAFETY_SESSION_MISSED_CHECKINS_ESCALATION.
 *
 * Validates: Requirements 11.3, 11.4
 */
export async function sendCheckIn(
  sessionId: string,
  deps: CheckInDeps,
): Promise<void> {
  const session = await deps.sessionStore.getSession(sessionId);
  if (!session || session.status !== SafetySessionStatus.Active) {
    return;
  }

  await deps.promptClient.sendPrompt(session.userId, sessionId);

  const now = new Date().toISOString();
  session.checkIns.push({
    promptedAt: now,
    respondedAt: null,
    response: null,
  });
  session.missedConsecutiveCheckIns += 1;

  if (session.missedConsecutiveCheckIns >= SAFETY_SESSION_MISSED_CHECKINS_ESCALATION) {
    await escalateToEmergencyContacts(session, 'missed_checkins', deps);
  }

  await deps.sessionStore.updateSession(sessionId, {
    checkIns: session.checkIns,
    missedConsecutiveCheckIns: session.missedConsecutiveCheckIns,
    status: session.status,
  });
}

/**
 * Processes a user's response to a check-in prompt.
 *
 * - If response is Distress, immediately escalates.
 * - Updates the last check-in entry with respondedAt and response.
 * - Resets missedConsecutiveCheckIns to 0.
 *
 * Validates: Requirements 11.3, 11.5
 */
export async function processCheckInResponse(
  sessionId: string,
  response: CheckInResponse,
  deps: CheckInDeps,
): Promise<void> {
  const session = await deps.sessionStore.getSession(sessionId);
  if (!session) {
    return;
  }

  if (response === CheckInResponse.Distress) {
    await escalateToEmergencyContacts(session, 'distress_signal', deps);
  }

  const now = new Date().toISOString();
  if (session.checkIns.length > 0) {
    const lastCheckIn = session.checkIns[session.checkIns.length - 1];
    lastCheckIn.respondedAt = now;
    lastCheckIn.response = response;
  }

  session.missedConsecutiveCheckIns = 0;

  await deps.sessionStore.updateSession(sessionId, {
    checkIns: session.checkIns,
    missedConsecutiveCheckIns: session.missedConsecutiveCheckIns,
    status: session.status,
  });
}

/**
 * Escalates to emergency contacts using opaque contact and location references.
 *
 * - Calls emergencyNotification.notifyEmergencyContacts.
 * - Sets session status to Escalated.
 *
 * Validates: Requirements 11.4, 11.5
 */
export async function escalateToEmergencyContacts(
  session: SafetySession,
  reason: 'missed_checkins' | 'distress_signal',
  deps: CheckInDeps,
): Promise<void> {
  await deps.emergencyNotification.notifyEmergencyContacts({
    emergencyContactRefs: session.emergencyContactRefs,
    userId: session.userId,
    lastKnownLocationRef: session.lastKnownLocationRef,
    reason,
  });

  session.status = SafetySessionStatus.Escalated;

  await deps.sessionStore.updateSession(session.sessionId, {
    status: SafetySessionStatus.Escalated,
  });
}
