import type {
  Signal,
  SafetySession,
  ContactRiskSummary,
} from '@safeguard-sentinel/shared';
import type { SafetySessionStatus } from '@safeguard-sentinel/shared';
import type { CheckInResponse } from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Safety session module — injectable interfaces
// ---------------------------------------------------------------------------

/** Client for retrieving a contact's behavioral history. */
export interface ContactHistoryClient {
  getContactHistory(
    contactId: string,
  ): Promise<{ compositeScore: number; flaggedSignals: Signal[] }>;
}

/** Client for resolving and verifying an opaque meeting-location reference. */
export interface LocationVerificationClient {
  verifyLocation(meetingLocation: {
    label: string;
    locationRef: string;
  }): Promise<boolean>;
}

/** DynamoDB-backed store for safety sessions. */
export interface SafetySessionStore {
  createSession(session: SafetySession): Promise<void>;
  getSession(sessionId: string): Promise<SafetySession | null>;
  updateSession(
    sessionId: string,
    updates: Partial<SafetySession>,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/** Incoming request to activate a safety session. */
export interface ActivateSessionRequest {
  userId: string;
  contactId: string;
  meetingLocation: { label: string; locationRef: string };
  emergencyContactRefs: string[];
}

/** Result returned after activating a safety session. */
export interface ActivateSessionResult {
  sessionId: string;
  status: SafetySessionStatus;
  contactRiskSummary: ContactRiskSummary;
  locationVerified: boolean;
}

/** Dependencies injected into the activateSession function. */
export interface ActivateSessionDeps {
  contactHistory: ContactHistoryClient;
  locationVerification: LocationVerificationClient;
  sessionStore: SafetySessionStore;
}

// ---------------------------------------------------------------------------
// Check-in cycle — injectable interfaces
// ---------------------------------------------------------------------------

/** Client for sending check-in prompts to users. */
export interface CheckInPromptClient {
  sendPrompt(userId: string, sessionId: string): Promise<void>;
}

/** Client for notifying emergency contacts using opaque references only. */
export interface EmergencyNotificationClient {
  notifyEmergencyContacts(params: {
    emergencyContactRefs: string[];
    userId: string;
    lastKnownLocationRef: string | null;
    reason: 'missed_checkins' | 'distress_signal';
  }): Promise<void>;
}

/** Dependencies injected into check-in cycle functions. */
export interface CheckInDeps {
  sessionStore: SafetySessionStore;
  promptClient: CheckInPromptClient;
  emergencyNotification: EmergencyNotificationClient;
}
