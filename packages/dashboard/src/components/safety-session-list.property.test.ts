import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatSafetySessionRow } from './SafetySessionList';
import { getSafetySessionStatusIndicator } from '../utils/safety-session-status';
import type { SafetySession } from '../types';
import { CheckInResponse, SafetySessionStatus, SignalSeverity } from '../types';

// Feature: safeguard-dashboard, Property 17: safety session list renders all required columns
// **Validates: Requirements 10.1**

const safetySessionStatusArb = fc.constantFrom(
  SafetySessionStatus.Active,
  SafetySessionStatus.Completed,
  SafetySessionStatus.Escalated
);

const meetingLocationArb = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }),
  verified: fc.boolean(),
  locationRef: fc.uuid(),
});

const signalSeverityArb = fc.constantFrom(
  SignalSeverity.Low,
  SignalSeverity.Medium,
  SignalSeverity.High,
  SignalSeverity.Critical
);

const signalArb = fc.record({
  signalType: fc.string({ minLength: 1, maxLength: 30 }),
  severity: signalSeverityArb,
  details: fc.constant({} as Record<string, unknown>),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
});

const contactRiskSummaryArb = fc.record({
  compositeScore: fc.integer({ min: 0, max: 100 }),
  flaggedSignals: fc.array(signalArb, { minLength: 0, maxLength: 3 }),
});

const checkInResponseArb = fc.constantFrom(
  CheckInResponse.Ok,
  CheckInResponse.Distress
);

const checkInArb = fc.record({
  promptedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  respondedAt: fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
    { nil: null }
  ),
  response: fc.option(checkInResponseArb, { nil: null }),
});

const safetySessionArb: fc.Arbitrary<SafetySession> = fc.record({
  sessionId: fc.uuid(),
  userId: fc.uuid(),
  contactId: fc.uuid(),
  contactRiskSummary: contactRiskSummaryArb,
  meetingLocation: meetingLocationArb,
  status: safetySessionStatusArb,
  checkIns: fc.array(checkInArb, { minLength: 0, maxLength: 5 }),
  missedConsecutiveCheckIns: fc.integer({ min: 0, max: 10 }),
  emergencyContactRefs: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 3 }),
  lastKnownLocationRef: fc.option(fc.uuid(), { nil: null }),
  startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  ttl: fc.integer({ min: 0, max: 2000000000 }),
});

describe('SafetySessionList formatSafetySessionRow property tests', () => {
  it('should include sessionId from the input', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.sessionId).toBe(session.sessionId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include userId from the input', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.userId).toBe(session.userId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include contactId from the input', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.contactId).toBe(session.contactId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include locationName from the input meetingLocation', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.locationName).toBe(session.meetingLocation.label);
      }),
      { numRuns: 100 }
    );
  });

  it('should include locationVerified from the input meetingLocation', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.locationVerified).toBe(session.meetingLocation.verified);
      }),
      { numRuns: 100 }
    );
  });

  it('should include status from the input', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.status).toBe(session.status);
      }),
      { numRuns: 100 }
    );
  });

  it('should include missedConsecutiveCheckIns from the input', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.missedConsecutiveCheckIns).toBe(session.missedConsecutiveCheckIns);
      }),
      { numRuns: 100 }
    );
  });

  it('should include startedAt from the input', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.startedAt).toBe(session.startedAt);
      }),
      { numRuns: 100 }
    );
  });

  it('should compute statusIndicator using getSafetySessionStatusIndicator', () => {
    fc.assert(
      fc.property(safetySessionArb, (session) => {
        const row = formatSafetySessionRow(session);
        expect(row.statusIndicator).toBe(
          getSafetySessionStatusIndicator(session.status, session.missedConsecutiveCheckIns)
        );
      }),
      { numRuns: 100 }
    );
  });
});
