// Feature: safeguard-sentinel, Property 29: Safety Session Activation Completeness

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { SafetySessionStatus } from '@safeguard-sentinel/shared';
import type { Signal } from '@safeguard-sentinel/shared';
import { activateSession } from './activate-session';
import type { ActivateSessionDeps, ActivateSessionRequest } from './types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbSignalSeverity = fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<Signal['severity']>;

const arbSignal: fc.Arbitrary<Signal> = fc.record({
  signalType: fc.stringOf(fc.constantFrom('a', 'b', 'c', '_'), { minLength: 1, maxLength: 20 }),
  severity: arbSignalSeverity,
  details: fc.constant({} as Record<string, unknown>),
  timestamp: fc.constant('2024-01-01T00:00:00Z'),
});

const arbCompositeScore = fc.integer({ min: 0, max: 100 });

const arbFlaggedSignals = fc.array(arbSignal, { minLength: 0, maxLength: 5 });

const arbLocationVerified = fc.boolean();

const arbActivateRequest: fc.Arbitrary<ActivateSessionRequest> = fc.record({
  userId: fc.uuid(),
  contactId: fc.uuid(),
  meetingLocation: fc.record({
    label: fc.string({ minLength: 1, maxLength: 50 }),
    locationRef: fc.uuid(),
  }),
  emergencyContactRefs: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
});

// ---------------------------------------------------------------------------
// Helper: build deps with call-order tracking
// ---------------------------------------------------------------------------

function makeDeps(opts: {
  compositeScore: number;
  flaggedSignals: Signal[];
  locationVerified: boolean;
}): { deps: ActivateSessionDeps; callOrder: string[] } {
  const callOrder: string[] = [];

  return {
    callOrder,
    deps: {
      contactHistory: {
        getContactHistory: vi.fn().mockImplementation(async () => {
          callOrder.push('getContactHistory');
          return {
            compositeScore: opts.compositeScore,
            flaggedSignals: opts.flaggedSignals,
          };
        }),
      },
      locationVerification: {
        verifyLocation: vi.fn().mockImplementation(async () => {
          callOrder.push('verifyLocation');
          return opts.locationVerified;
        }),
      },
      sessionStore: {
        createSession: vi.fn().mockImplementation(async () => {
          callOrder.push('createSession');
        }),
        getSession: vi.fn().mockResolvedValue(null),
        updateSession: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
}


// ---------------------------------------------------------------------------
// Property 29: Safety Session Activation Completeness
// ---------------------------------------------------------------------------

describe('Property 29: Safety Session Activation Completeness', () => {
  // **Validates: Requirements 11.1, 11.2**

  it('getContactHistory is always called before session is created', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbActivateRequest,
        arbCompositeScore,
        arbFlaggedSignals,
        arbLocationVerified,
        async (request, compositeScore, flaggedSignals, locationVerified) => {
          const { deps, callOrder } = makeDeps({ compositeScore, flaggedSignals, locationVerified });

          await activateSession(request, deps);

          const historyIdx = callOrder.indexOf('getContactHistory');
          const createIdx = callOrder.indexOf('createSession');

          expect(historyIdx).toBeGreaterThanOrEqual(0);
          expect(createIdx).toBeGreaterThanOrEqual(0);
          expect(historyIdx).toBeLessThan(createIdx);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('verifyLocation is always called before session is created', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbActivateRequest,
        arbCompositeScore,
        arbFlaggedSignals,
        arbLocationVerified,
        async (request, compositeScore, flaggedSignals, locationVerified) => {
          const { deps, callOrder } = makeDeps({ compositeScore, flaggedSignals, locationVerified });

          await activateSession(request, deps);

          const locationIdx = callOrder.indexOf('verifyLocation');
          const createIdx = callOrder.indexOf('createSession');

          expect(locationIdx).toBeGreaterThanOrEqual(0);
          expect(createIdx).toBeGreaterThanOrEqual(0);
          expect(locationIdx).toBeLessThan(createIdx);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returned status is always Active', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbActivateRequest,
        arbCompositeScore,
        arbFlaggedSignals,
        arbLocationVerified,
        async (request, compositeScore, flaggedSignals, locationVerified) => {
          const { deps } = makeDeps({ compositeScore, flaggedSignals, locationVerified });

          const result = await activateSession(request, deps);

          expect(result.status).toBe(SafetySessionStatus.Active);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('contactRiskSummary in result matches contact history response', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbActivateRequest,
        arbCompositeScore,
        arbFlaggedSignals,
        arbLocationVerified,
        async (request, compositeScore, flaggedSignals, locationVerified) => {
          const { deps } = makeDeps({ compositeScore, flaggedSignals, locationVerified });

          const result = await activateSession(request, deps);

          expect(result.contactRiskSummary.compositeScore).toBe(compositeScore);
          expect(result.contactRiskSummary.flaggedSignals).toEqual(flaggedSignals);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('locationVerified in result matches meetingLocation verification response', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbActivateRequest,
        arbCompositeScore,
        arbFlaggedSignals,
        arbLocationVerified,
        async (request, compositeScore, flaggedSignals, locationVerified) => {
          const { deps } = makeDeps({ compositeScore, flaggedSignals, locationVerified });

          const result = await activateSession(request, deps);

          expect(result.locationVerified).toBe(locationVerified);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// Feature: safeguard-sentinel, Property 30: Safety Session Emergency Escalation
// Feature: safeguard-sentinel, Property 28: Location References Scoped to Active Sessions

import {
  CheckInResponse,
  SAFETY_SESSION_MISSED_CHECKINS_ESCALATION,
} from '@safeguard-sentinel/shared';
import type { SafetySession } from '@safeguard-sentinel/shared';
import { sendCheckIn, processCheckInResponse } from './check-in';
import type { CheckInDeps } from './types';

// ---------------------------------------------------------------------------
// Arbitraries for check-in property tests
// ---------------------------------------------------------------------------

const arbActiveSession: fc.Arbitrary<SafetySession> = fc.record({
  sessionId: fc.uuid(),
  userId: fc.uuid(),
  contactId: fc.uuid(),
  contactRiskSummary: fc.record({
    compositeScore: fc.integer({ min: 0, max: 100 }),
    flaggedSignals: fc.constant([]),
  }),
  meetingLocation: fc.record({
    label: fc.string({ minLength: 1, maxLength: 30 }),
    verified: fc.boolean(),
    locationRef: fc.uuid(),
  }),
  status: fc.constant(SafetySessionStatus.Active as SafetySessionStatus),
  checkIns: fc.constant([]),
  missedConsecutiveCheckIns: fc.constant(SAFETY_SESSION_MISSED_CHECKINS_ESCALATION - 1),
  emergencyContactRefs: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  lastKnownLocationRef: fc.option(fc.uuid(), { nil: null }),
  startedAt: fc.constant('2024-01-01T00:00:00Z'),
  ttl: fc.constant(1735689600),
});

const arbDistressSession: fc.Arbitrary<SafetySession> = fc.record({
  sessionId: fc.uuid(),
  userId: fc.uuid(),
  contactId: fc.uuid(),
  contactRiskSummary: fc.record({
    compositeScore: fc.integer({ min: 0, max: 100 }),
    flaggedSignals: fc.constant([]),
  }),
  meetingLocation: fc.record({
    label: fc.string({ minLength: 1, maxLength: 30 }),
    verified: fc.boolean(),
    locationRef: fc.uuid(),
  }),
  status: fc.constant(SafetySessionStatus.Active as SafetySessionStatus),
  checkIns: fc.array(
    fc.record({
      promptedAt: fc.constant('2024-01-01T00:00:00Z'),
      respondedAt: fc.constant(null as string | null),
      response: fc.constant(null as CheckInResponse | null),
    }),
    { minLength: 1, maxLength: 3 },
  ),
  missedConsecutiveCheckIns: fc.integer({ min: 0, max: 5 }),
  emergencyContactRefs: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  lastKnownLocationRef: fc.option(fc.uuid(), { nil: null }),
  startedAt: fc.constant('2024-01-01T00:00:00Z'),
  ttl: fc.constant(1735689600),
});

const arbInactiveStatus = fc.constantFrom(
  SafetySessionStatus.Completed,
  SafetySessionStatus.Escalated,
);

function makeCheckInDeps(session: SafetySession | null): CheckInDeps {
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
// Property 30: Safety Session Emergency Escalation
// ---------------------------------------------------------------------------

describe('Property 30: Safety Session Emergency Escalation', () => {
  // **Validates: Requirements 11.4, 11.5**

  it('escalates after missed check-ins reach threshold via sendCheckIn', async () => {
    await fc.assert(
      fc.asyncProperty(arbActiveSession, async (session) => {
        const deps = makeCheckInDeps(session);

        await sendCheckIn(session.sessionId, deps);

        expect(deps.emergencyNotification.notifyEmergencyContacts).toHaveBeenCalledWith({
          emergencyContactRefs: session.emergencyContactRefs,
          userId: session.userId,
          lastKnownLocationRef: session.lastKnownLocationRef,
          reason: 'missed_checkins',
        });
      }),
      { numRuns: 100 },
    );
  });

  it('escalates immediately on distress signal via processCheckInResponse', async () => {
    await fc.assert(
      fc.asyncProperty(arbDistressSession, async (session) => {
        const deps = makeCheckInDeps(session);

        await processCheckInResponse(session.sessionId, CheckInResponse.Distress, deps);

        expect(deps.emergencyNotification.notifyEmergencyContacts).toHaveBeenCalledWith({
          emergencyContactRefs: session.emergencyContactRefs,
          userId: session.userId,
          lastKnownLocationRef: session.lastKnownLocationRef,
          reason: 'distress_signal',
        });
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 28: Location References Scoped to Active Safety Sessions
// ---------------------------------------------------------------------------

describe('Property 28: Location References Scoped to Active Safety Sessions', () => {
  // **Validates: Requirements 15.3**

  it('no prompt sent and no session update for non-active sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbActiveSession,
        arbInactiveStatus,
        async (baseSession, inactiveStatus) => {
          const session: SafetySession = { ...baseSession, status: inactiveStatus };
          const deps = makeCheckInDeps(session);

          await sendCheckIn(session.sessionId, deps);

          expect(deps.promptClient.sendPrompt).not.toHaveBeenCalled();
          expect(deps.sessionStore.updateSession).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
