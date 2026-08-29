import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getColorCode } from './color-code';

// Feature: safeguard-dashboard, Property 1: Color code mapping is consistent with thresholds
// **Validates: Requirements 4.3**
describe('getColorCode property tests', () => {
  it('should return green for scores below 60', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59 }), (score) => {
        expect(getColorCode(score)).toBe('green');
      }),
      { numRuns: 100 }
    );
  });

  it('should return amber for scores from 60 to 87', () => {
    fc.assert(
      fc.property(fc.integer({ min: 60, max: 87 }), (score) => {
        expect(getColorCode(score)).toBe('amber');
      }),
      { numRuns: 100 }
    );
  });

  it('should return red for scores 88 and above', () => {
    fc.assert(
      fc.property(fc.integer({ min: 88, max: 100 }), (score) => {
        expect(getColorCode(score)).toBe('red');
      }),
      { numRuns: 100 }
    );
  });
});
