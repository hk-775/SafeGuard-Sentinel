import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeBackoff } from './backoff';

// Feature: safeguard-dashboard, Property 3: Exponential backoff computation
// **Validates: Requirements 2.3**
describe('computeBackoff property tests', () => {
  it('should equal min(initialBackoff * 2^attempt, maxBackoff)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (attempt) => {
        const result = computeBackoff(attempt);
        const expected = Math.min(1000 * Math.pow(2, attempt), 30000);
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('should never exceed maxBackoff', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 5001, max: 60000 }),
        (attempt, initialBackoff, maxBackoff) => {
          const result = computeBackoff(attempt, initialBackoff, maxBackoff);
          expect(result).toBeLessThanOrEqual(maxBackoff);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be monotonically non-decreasing with attempt number', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 19 }), (attempt) => {
        const current = computeBackoff(attempt);
        const next = computeBackoff(attempt + 1);
        expect(next).toBeGreaterThanOrEqual(current);
      }),
      { numRuns: 100 }
    );
  });
});
