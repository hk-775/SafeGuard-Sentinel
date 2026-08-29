import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatMetrics } from './MetricsPanel';
import type { AggregateMetrics } from '../types';

// Feature: safeguard-dashboard, Property 4: Metrics panel renders all AggregateMetrics fields with correct formatting
// **Validates: Requirements 3.1, 3.3, 12.1, 12.3, 12.4**

const aggregateMetricsArb: fc.Arbitrary<AggregateMetrics> = fc.record({
  threatsNeutralized: fc.nat(),
  avgResponseTimeMs: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
  falsePositiveRate: fc.float({ min: 0, max: 100, noNaN: true }),
  networksDisrupted: fc.nat(),
  photosAnalyzed: fc.nat(),
  messagesScanned: fc.nat(),
  behavioralSessions: fc.nat(),
  temporalEvaluations: fc.nat(),
  activeSafetySessions: fc.nat(),
});

describe('MetricsPanel formatMetrics property tests', () => {
  it('should return exactly 9 formatted metrics for any valid AggregateMetrics', () => {
    fc.assert(
      fc.property(aggregateMetricsArb, (metrics) => {
        const result = formatMetrics(metrics);
        expect(result).toHaveLength(9);
      }),
      { numRuns: 100 }
    );
  });

  it('should include all 9 AggregateMetrics keys', () => {
    fc.assert(
      fc.property(aggregateMetricsArb, (metrics) => {
        const result = formatMetrics(metrics);
        const keys = result.map((m) => m.key);
        expect(keys).toContain('threatsNeutralized');
        expect(keys).toContain('avgResponseTimeMs');
        expect(keys).toContain('falsePositiveRate');
        expect(keys).toContain('networksDisrupted');
        expect(keys).toContain('photosAnalyzed');
        expect(keys).toContain('messagesScanned');
        expect(keys).toContain('behavioralSessions');
        expect(keys).toContain('temporalEvaluations');
        expect(keys).toContain('activeSafetySessions');
      }),
      { numRuns: 100 }
    );
  });

  it('should format avgResponseTimeMs with "ms" suffix', () => {
    fc.assert(
      fc.property(aggregateMetricsArb, (metrics) => {
        const result = formatMetrics(metrics);
        const avgResponseTime = result.find((m) => m.key === 'avgResponseTimeMs');
        expect(avgResponseTime).toBeDefined();
        expect(avgResponseTime!.value).toMatch(/ms$/);
        expect(avgResponseTime!.value).toBe(`${metrics.avgResponseTimeMs}ms`);
      }),
      { numRuns: 100 }
    );
  });

  it('should format falsePositiveRate with "%" suffix', () => {
    fc.assert(
      fc.property(aggregateMetricsArb, (metrics) => {
        const result = formatMetrics(metrics);
        const falsePositiveRate = result.find((m) => m.key === 'falsePositiveRate');
        expect(falsePositiveRate).toBeDefined();
        expect(falsePositiveRate!.value).toMatch(/%$/);
        expect(falsePositiveRate!.value).toBe(`${metrics.falsePositiveRate}%`);
      }),
      { numRuns: 100 }
    );
  });

  it('should contain the numeric value for each metric in its formatted value', () => {
    fc.assert(
      fc.property(aggregateMetricsArb, (metrics) => {
        const result = formatMetrics(metrics);
        for (const formatted of result) {
          const rawValue = metrics[formatted.key as keyof AggregateMetrics];
          expect(formatted.value).toContain(String(rawValue));
        }
      }),
      { numRuns: 100 }
    );
  });
});
