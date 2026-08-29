import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendCheckIn, processCheckInResponse, escalateToEmergencyContacts } from './check-in';
import {
  SafetySessionStatus,
  CheckInResponse,
  SAFETY_SESSION_MISSED_CHECKINS_ESCALATION,
} from '@safeguard-sentinel/shared';
import type { SafetySession } from '@safeguard-sentinel/shared';
import type { CheckInDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<SafetySession> = {}): SafetySession {
  return {
    sessionId: 'session-001',
    userId: 'user-demo-001',
    contactId: 'contact-demo-001',
    contactRiskSummary: { compositeScore: 10, flaggedSignals: [] },
    meetingLocation: {
      label: 'Verified public location',
      verified: true,
      locationRef: 'location-ref-demo-001',
    },
    status: SafetySessionStatus.Active,
    checkIns: [],
    missedConsecutiveCheckIns: 0,
    emergencyContactRefs: ['contact-ref-demo-001', 'contact-ref-demo-002'],
    lastKnownLocationRef: 'location-ref-demo-001',
    startedAt: '2024-07-01T12:00:00.000Z',
    ttl: 1722470400,
    ...overrides,
  };
}

function makeDeps(session: SafetySession | null = makeSession()): CheckInDeps {
  return {
    sessionStore: {
      createSession: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn().mockResolvedValue(session),
      updateSession: vi.fn().mockResolvedValue(undefined),
    },
    promptClient: {
      sendPrompt: vi.fn().mockResolvedValue(undefined),
    },
    emergencyNotification: {
      notifyEmergencyContacts: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// sendCheckIn
// ---------------------------------------------------------------------------

describe('sendCheckIn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-07-01T18:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should send prompt, add check-in entry, and increment missed count', async () => {
    const session = makeSession();
    const deps = makeDeps(session);

    await sendCheckIn('session-001', deps);

    expect(deps.promptClient.sendPrompt).toHaveBeenCalledWith('user-demo-001', 'session-001');
    expect(deps.sessionStore.updateSession).toHaveBeenCalledWith('session-001', expect.objectContaining({
      checkIns: [
        { promptedAt: '2024-07-01T18:00:00.000Z', respondedAt: null, response: null },
      ],
      missedConsecutiveCheckIns: 1,
    }));
  });

  it('should be a no-op when session is not Active', async () => {
    const session = makeSession({ status: SafetySessionStatus.Completed });
    const deps = makeDeps(session);

    await sendCheckIn('session-001', deps);

    expect(deps.promptClient.sendPrompt).not.toHaveBeenCalled();
    expect(deps.sessionStore.updateSession).not.toHaveBeenCalled();
  });

  it('should be a no-op when session is null', async () => {
    const deps = makeDeps(null);

    await sendCheckIn('session-001', deps);

    expect(deps.promptClient.sendPrompt).not.toHaveBeenCalled();
    expect(deps.sessionStore.updateSession).not.toHaveBeenCalled();
  });

  it('should escalate after 2 missed check-ins', async () => {
    const session = makeSession({ missedConsecutiveCheckIns: SAFETY_SESSION_MISSED_CHECKINS_ESCALATION - 1 });
    const deps = makeDeps(session);

    await sendCheckIn('session-001', deps);

    expect(deps.emergencyNotification.notifyEmergencyContacts).toHaveBeenCalledWith({
      emergencyContactRefs: ['contact-ref-demo-001', 'contact-ref-demo-002'],
      userId: 'user-demo-001',
      lastKnownLocationRef: 'location-ref-demo-001',
      reason: 'missed_checkins',
    });
  });

  it('should not escalate when missed count is below threshold', async () => {
    const session = makeSession({ missedConsecutiveCheckIns: 0 });
    const deps = makeDeps(session);

    await sendCheckIn('session-001', deps);

    // After this call, missedConsecutiveCheckIns = 1, which is < 2
    expect(deps.emergencyNotification.notifyEmergencyContacts).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// processCheckInResponse
// ---------------------------------------------------------------------------

describe('processCheckInResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-07-01T18:05:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reset missed count and update last check-in on OK response', async () => {
    const session = makeSession({
      missedConsecutiveCheckIns: 1,
      checkIns: [{ promptedAt: '2024-07-01T18:00:00.000Z', respondedAt: null, response: null }],
    });
    const deps = makeDeps(session);

    await processCheckInResponse('session-001', CheckInResponse.Ok, deps);

    expect(deps.sessionStore.updateSession).toHaveBeenCalledWith('session-001', expect.objectContaining({
      missedConsecutiveCheckIns: 0,
      checkIns: [
        {
          promptedAt: '2024-07-01T18:00:00.000Z',
          respondedAt: '2024-07-01T18:05:00.000Z',
          response: CheckInResponse.Ok,
        },
      ],
    }));
  });

  it('should escalate on distress signal', async () => {
    const session = makeSession({
      checkIns: [{ promptedAt: '2024-07-01T18:00:00.000Z', respondedAt: null, response: null }],
    });
    const deps = makeDeps(session);

    await processCheckInResponse('session-001', CheckInResponse.Distress, deps);

    expect(deps.emergencyNotification.notifyEmergencyContacts).toHaveBeenCalledWith({
      emergencyContactRefs: ['contact-ref-demo-001', 'contact-ref-demo-002'],
      userId: 'user-demo-001',
      lastKnownLocationRef: 'location-ref-demo-001',
      reason: 'distress_signal',
    });
  });

  it('should not escalate on OK response', async () => {
    const session = makeSession({
      checkIns: [{ promptedAt: '2024-07-01T18:00:00.000Z', respondedAt: null, response: null }],
    });
    const deps = makeDeps(session);

    await processCheckInResponse('session-001', CheckInResponse.Ok, deps);

    expect(deps.emergencyNotification.notifyEmergencyContacts).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// escalateToEmergencyContacts
// ---------------------------------------------------------------------------

describe('escalateToEmergencyContacts', () => {
  it('should notify contacts with correct params and set status to Escalated', async () => {
    const session = makeSession();
    const deps = makeDeps(session);

    await escalateToEmergencyContacts(session, 'missed_checkins', deps);

    expect(deps.emergencyNotification.notifyEmergencyContacts).toHaveBeenCalledWith({
      emergencyContactRefs: ['contact-ref-demo-001', 'contact-ref-demo-002'],
      userId: 'user-demo-001',
      lastKnownLocationRef: 'location-ref-demo-001',
      reason: 'missed_checkins',
    });
    expect(session.status).toBe(SafetySessionStatus.Escalated);
    expect(deps.sessionStore.updateSession).toHaveBeenCalledWith('session-001', {
      status: SafetySessionStatus.Escalated,
    });
  });

  it('should handle distress_signal reason correctly', async () => {
    const session = makeSession();
    const deps = makeDeps(session);

    await escalateToEmergencyContacts(session, 'distress_signal', deps);

    expect(deps.emergencyNotification.notifyEmergencyContacts).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'distress_signal' }),
    );
    expect(session.status).toBe(SafetySessionStatus.Escalated);
  });
});
