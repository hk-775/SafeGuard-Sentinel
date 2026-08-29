// Feature: safeguard-sentinel, Property 33: Dashboard Color Coding Consistency

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getColorCode } from './metrics';
import type { DashboardColorCode } from './types';

// ---------------------------------------------------------------------------
// Property 33: Dashboard Color Coding Consistency
// ---------------------------------------------------------------------------

describe('Property 33: Dashboard Color Coding Consistency', () => {
  // **Validates: Requirements 22.7**

  it('maps scores < 60 to green (safe/resolved)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 59.99, noNaN: true }),
        (score) => {
          expect(getColorCode(score)).toBe('green');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('maps scores in [60, 88) to amber (warning)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 60, max: 87.99, noNaN: true }),
        (score) => {
          expect(getColorCode(score)).toBe('amber');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('maps scores >= 88 to red (critical)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 88, max: 100, noNaN: true }),
        (score) => {
          expect(getColorCode(score)).toBe('red');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (score) => {
          const first: DashboardColorCode = getColorCode(score);
          const second: DashboardColorCode = getColorCode(score);
          expect(first).toBe(second);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('always returns a valid color code for any score in [0, 100]', () => {
    const validColors: DashboardColorCode[] = ['green', 'amber', 'red'];
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (score) => {
          const color = getColorCode(score);
          expect(validColors).toContain(color);
        },
      ),
      { numRuns: 100 },
    );
  });
});
