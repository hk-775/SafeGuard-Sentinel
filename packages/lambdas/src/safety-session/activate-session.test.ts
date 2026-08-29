import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { activateSession } from './activate-session';
import {
  SafetySessionStatus,
  CONTENT_RETENTION_DAYS,
} from '@safeguard-sentinel/shared';
import type {
  ActivateSessionRequest,
  ActivateSessionDeps,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  overrides: Partial<ActivateSessionRequest> = {},
): ActivateSessionRequest {
  return {
    userId: 'user-demo-001',
    contactId: 'contact-demo-001',
    meetingLocation: {
      label: 'Verified public location',
      locationRef: 'location-ref-demo-001',
    },
    emergencyContactRefs: ['contact-ref-demo-001', 'contact-ref-demo-002'],
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ActivateSessionDeps> = {}): ActivateSessionDeps {
  return {
    contactHistory: {
      getContactHistory: vi.fn().mockResolvedValue({
        compositeScore: 25,
        flaggedSignals: [],
      }),
    },
    locationVerification: {
      verifyLocation: vi.fn().mockResolvedValue(true),
    },
    sessionStore: {
      createSession: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn().mockResolvedValue(null),
      updateSession: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('activateSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-07-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should query contact behavioral history with the correct contactId', async () => {
    const request = makeRequest({ contactId: 'contact-demo-xyz' });
    const deps = makeDeps();

    await activateSession(request, deps);

    expect(deps.contactHistory.getContactHistory).toHaveBeenCalledWith('contact-demo-xyz');
  });

  it('should verify the opaque meeting-location reference', async () => {
    const meetingLocation = {
      label: 'Public meeting location',
      locationRef: 'location-ref-demo-002',
    };
    const request = makeRequest({ meetingLocation });
    const deps = makeDeps();

    await activateSession(request, deps);

    expect(deps.locationVerification.verifyLocation).toHaveBeenCalledWith(meetingLocation);
  });

  it('should create a session in the store with correct fields', async () => {
    const request = makeRequest();
    const deps = makeDeps();

    await activateSession(request, deps);

    expect(deps.sessionStore.createSession).toHaveBeenCalledTimes(1);
    const session = vi.mocked(deps.sessionStore.createSession).mock.calls[0][0];

    expect(session.userId).toBe('user-demo-001');
    expect(session.contactId).toBe('contact-demo-001');
    expect(session.meetingLocation.label).toBe('Verified public location');
    expect(session.meetingLocation.locationRef).toBe('location-ref-demo-001');
    expect(session.meetingLocation.verified).toBe(true);
    expect(session.emergencyContactRefs).toEqual([
      'contact-ref-demo-001',
      'contact-ref-demo-002',
    ]);
    expect(session.checkIns).toEqual([]);
    expect(session.missedConsecutiveCheckIns).toBe(0);
    expect(session.lastKnownLocationRef).toBe('location-ref-demo-001');
    expect(session.startedAt).toBe('2024-07-01T12:00:00.000Z');
  });

  it('should return result with sessionId, status, contactRiskSummary, and locationVerified', async () => {
    const deps = makeDeps();

    const result = await activateSession(makeRequest(), deps);

    expect(result).toHaveProperty('sessionId');
    expect(typeof result.sessionId).toBe('string');
    expect(result.sessionId.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('contactRiskSummary');
    expect(result).toHaveProperty('locationVerified');
  });

  it('should set session status to Active', async () => {
    const deps = makeDeps();

    const result = await activateSession(makeRequest(), deps);

    expect(result.status).toBe(SafetySessionStatus.Active);

    const session = vi.mocked(deps.sessionStore.createSession).mock.calls[0][0];
    expect(session.status).toBe(SafetySessionStatus.Active);
  });

  it('should compute TTL using CONTENT_RETENTION_DAYS', async () => {
    const deps = makeDeps();

    await activateSession(makeRequest(), deps);

    const session = vi.mocked(deps.sessionStore.createSession).mock.calls[0][0];
    const expectedEpoch = Math.floor(new Date('2024-07-01T12:00:00Z').getTime() / 1000);
    const expectedTtl = expectedEpoch + CONTENT_RETENTION_DAYS * 24 * 60 * 60;

    expect(session.ttl).toBe(expectedTtl);
  });

  it('should return contact risk summary from contact history', async () => {
    const deps = makeDeps({
      contactHistory: {
        getContactHistory: vi.fn().mockResolvedValue({
          compositeScore: 42,
          flaggedSignals: [
            {
              signalType: 'velocity_anomaly',
              severity: 'medium',
              details: {},
              timestamp: '2024-06-30T10:00:00Z',
            },
          ],
        }),
      },
    });

    const result = await activateSession(makeRequest(), deps);

    expect(result.contactRiskSummary.compositeScore).toBe(42);
    expect(result.contactRiskSummary.flaggedSignals).toHaveLength(1);
    expect(result.contactRiskSummary.flaggedSignals[0].signalType).toBe('velocity_anomaly');
  });

  it('should return locationVerified as false when meetingLocation is not verified', async () => {
    const deps = makeDeps({
      locationVerification: {
        verifyLocation: vi.fn().mockResolvedValue(false),
      },
    });

    const result = await activateSession(makeRequest(), deps);

    expect(result.locationVerified).toBe(false);

    const session = vi.mocked(deps.sessionStore.createSession).mock.calls[0][0];
    expect(session.meetingLocation.verified).toBe(false);
  });

  it('should generate a unique sessionId (UUID format)', async () => {
    const deps = makeDeps();

    const result1 = await activateSession(makeRequest(), deps);
    const result2 = await activateSession(makeRequest(), deps);

    // UUID v4 format
    expect(result1.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result1.sessionId).not.toBe(result2.sessionId);
  });
});
