import { randomUUID } from 'crypto';
import {
  SafetySessionStatus,
  CONTENT_RETENTION_DAYS,
} from '@safeguard-sentinel/shared';
import type { SafetySession } from '@safeguard-sentinel/shared';
import type {
  ActivateSessionRequest,
  ActivateSessionResult,
  ActivateSessionDeps,
} from './types';

/**
 * Activates a new safety session.
 *
 * 1. Generates a unique session ID.
 * 2. Queries the contact's behavioral history.
 * 3. Verifies an opaque meeting-location reference.
 * 4. Persists the session to DynamoDB.
 * 5. Returns the session confirmation with a contact risk summary.
 *
 * Validates: Requirements 11.1, 11.2
 */
export async function activateSession(
  request: ActivateSessionRequest,
  deps: ActivateSessionDeps,
): Promise<ActivateSessionResult> {
  const sessionId = randomUUID();
  const now = new Date();

  // Query contact behavioral history (Req 11.1)
  const contactHistory = await deps.contactHistory.getContactHistory(
    request.contactId,
  );

  // Resolve and verify the opaque location reference (Req 11.2)
  const locationVerified = await deps.locationVerification.verifyLocation(request.meetingLocation);

  const contactRiskSummary = {
    compositeScore: contactHistory.compositeScore,
    flaggedSignals: contactHistory.flaggedSignals,
  };

  // Compute TTL: creation epoch + CONTENT_RETENTION_DAYS
  const ttl =
    Math.floor(now.getTime() / 1000) + CONTENT_RETENTION_DAYS * 24 * 60 * 60;

  const session: SafetySession = {
    sessionId,
    userId: request.userId,
    contactId: request.contactId,
    contactRiskSummary,
    meetingLocation: {
      label: request.meetingLocation.label,
      verified: locationVerified,
      locationRef: request.meetingLocation.locationRef,
    },
    status: SafetySessionStatus.Active,
    checkIns: [],
    missedConsecutiveCheckIns: 0,
    emergencyContactRefs: request.emergencyContactRefs,
    lastKnownLocationRef: request.meetingLocation.locationRef,
    startedAt: now.toISOString(),
    ttl,
  };

  await deps.sessionStore.createSession(session);

  return {
    sessionId,
    status: SafetySessionStatus.Active,
    contactRiskSummary,
    locationVerified,
  };
}
