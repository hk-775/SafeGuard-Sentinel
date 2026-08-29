import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getSafetySessionStatusIndicator } from './safety-session-status';
import { SafetySessionStatus } from '../types';

// Feature: safeguard-dashboard, Property 16: safety session status indicator mapping
// **Validates: Requirements 10.2, 10.3**
describe('getSafetySessionStatusIndicator property tests', () => {
  it('should return red for Escalated status regardless of missed check-ins', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (missedCheckIns) => {
        expect(
          getSafetySessionStatusIndicator(SafetySessionStatus.Escalated, missedCheckIns)
        ).toBe('red');
      }),
      { numRuns: 100 }
    );
  });

  it('should return amber for 1 missed check-in when not Escalated', () => {
    const nonEscalatedStatus = fc.constantFrom(
      SafetySessionStatus.Active,
      SafetySessionStatus.Completed
    );
    fc.assert(
      fc.property(nonEscalatedStatus, (status) => {
        expect(getSafetySessionStatusIndicator(status, 1)).toBe('amber');
      }),
      { numRuns: 100 }
    );
  });

  it('should return default for non-Escalated with missed check-ins != 1', () => {
    const nonEscalatedStatus = fc.constantFrom(
      SafetySessionStatus.Active,
      SafetySessionStatus.Completed
    );
    const missedNotOne = fc.integer({ min: 0, max: 10 }).filter((n) => n !== 1);
    fc.assert(
      fc.property(nonEscalatedStatus, missedNotOne, (status, missed) => {
        expect(getSafetySessionStatusIndicator(status, missed)).toBe('default');
      }),
      { numRuns: 100 }
    );
  });
});
