import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getSlaHealthIndicator } from './sla-health';

// Feature: safeguard-dashboard, Property 19: SLA health indicator mapping
// **Validates: Requirements 12.2**
describe('getSlaHealthIndicator property tests', () => {
  it('should return green when avgResponseTimeMs < 60000', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59999 }), (avgResponseTimeMs) => {
        expect(getSlaHealthIndicator(avgResponseTimeMs)).toBe('green');
      }),
      { numRuns: 100 }
    );
  });

  it('should return red when avgResponseTimeMs >= 60000', () => {
    fc.assert(
      fc.property(fc.integer({ min: 60000, max: 300000 }), (avgResponseTimeMs) => {
        expect(getSlaHealthIndicator(avgResponseTimeMs)).toBe('red');
      }),
      { numRuns: 100 }
    );
  });
});
