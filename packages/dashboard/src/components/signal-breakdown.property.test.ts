import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatSignalBreakdown } from './SignalBreakdownChart';
import type { SignalBreakdown } from '../types';

// Feature: safeguard-dashboard, Property 8: Signal breakdown chart displays all four domains with labels and scores
// **Validates: Requirements 5.1, 5.3**

const signalBreakdownArb: fc.Arbitrary<SignalBreakdown> = fc.record({
  visual: fc.double({ min: 0, max: 100, noNaN: true }),
  textual: fc.double({ min: 0, max: 100, noNaN: true }),
  behavioral: fc.double({ min: 0, max: 100, noNaN: true }),
  temporal: fc.double({ min: 0, max: 100, noNaN: true }),
});

describe('SignalBreakdownChart formatSignalBreakdown property tests', () => {
  it('should return exactly four entries', () => {
    fc.assert(
      fc.property(signalBreakdownArb, (breakdown) => {
        const result = formatSignalBreakdown(breakdown);
        expect(result).toHaveLength(4);
      }),
      { numRuns: 100 }
    );
  });

  it('should contain all four domain labels: visual, textual, behavioral, temporal', () => {
    fc.assert(
      fc.property(signalBreakdownArb, (breakdown) => {
        const result = formatSignalBreakdown(breakdown);
        const domains = result.map((e) => e.domain);
        expect(domains).toEqual(['visual', 'textual', 'behavioral', 'temporal']);
      }),
      { numRuns: 100 }
    );
  });

  it('should map each domain score correctly from the input', () => {
    fc.assert(
      fc.property(signalBreakdownArb, (breakdown) => {
        const result = formatSignalBreakdown(breakdown);
        expect(result[0].score).toBe(breakdown.visual);
        expect(result[1].score).toBe(breakdown.textual);
        expect(result[2].score).toBe(breakdown.behavioral);
        expect(result[3].score).toBe(breakdown.temporal);
      }),
      { numRuns: 100 }
    );
  });
});
