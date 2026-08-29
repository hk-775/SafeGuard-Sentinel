import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getAppealSlaStatus } from './appeal-sla';

const ONE_HOUR_MS = 60 * 60 * 1000;

// Feature: safeguard-dashboard, Property 2: Appeal SLA status classification
// **Validates: Requirements 8.2, 8.3**
describe('getAppealSlaStatus property tests', () => {
  it('should return breached when now >= deadline', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.integer({ min: 0, max: 86400000 }),
        (deadline, offsetMs) => {
          const now = new Date(deadline.getTime() + offsetMs);
          expect(getAppealSlaStatus(deadline.toISOString(), now)).toBe('breached');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return warning when 0 < remaining <= 1 hour', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.integer({ min: 1, max: ONE_HOUR_MS }),
        (deadline, remainingMs) => {
          const now = new Date(deadline.getTime() - remainingMs);
          expect(getAppealSlaStatus(deadline.toISOString(), now)).toBe('warning');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return ok when remaining > 1 hour', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.integer({ min: ONE_HOUR_MS + 1, max: 86400000 }),
        (deadline, remainingMs) => {
          const now = new Date(deadline.getTime() - remainingMs);
          expect(getAppealSlaStatus(deadline.toISOString(), now)).toBe('ok');
        }
      ),
      { numRuns: 100 }
    );
  });
});
