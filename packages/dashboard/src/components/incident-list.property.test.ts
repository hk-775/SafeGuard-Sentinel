import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatIncidentRow } from './IncidentList';
import type { IncidentReport } from '../types';

// Feature: safeguard-dashboard, Property 18: Incident report rendering includes all required columns
// **Validates: Requirements 11.1, 11.3**

const incidentTypeArb = fc.constantFrom(
  'fraud' as const,
  'harassment' as const,
  'physical_safety' as const
);

const incidentReportArb: fc.Arbitrary<IncidentReport> = fc.record({
  reportId: fc.uuid(),
  sessionId: fc.uuid(),
  userId: fc.uuid(),
  incidentType: incidentTypeArb,
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
});

describe('IncidentList formatIncidentRow property tests', () => {
  it('should include reportId from the input', () => {
    fc.assert(
      fc.property(incidentReportArb, (report) => {
        const row = formatIncidentRow(report);
        expect(row.reportId).toBe(report.reportId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include sessionId from the input', () => {
    fc.assert(
      fc.property(incidentReportArb, (report) => {
        const row = formatIncidentRow(report);
        expect(row.sessionId).toBe(report.sessionId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include userId from the input', () => {
    fc.assert(
      fc.property(incidentReportArb, (report) => {
        const row = formatIncidentRow(report);
        expect(row.userId).toBe(report.userId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include incidentType from the input', () => {
    fc.assert(
      fc.property(incidentReportArb, (report) => {
        const row = formatIncidentRow(report);
        expect(row.incidentType).toBe(report.incidentType);
      }),
      { numRuns: 100 }
    );
  });

  it('should include timestamp from the input', () => {
    fc.assert(
      fc.property(incidentReportArb, (report) => {
        const row = formatIncidentRow(report);
        expect(row.timestamp).toBe(report.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  it('should apply red indicator for physical_safety type', () => {
    fc.assert(
      fc.property(incidentReportArb, (report) => {
        const row = formatIncidentRow(report);
        if (report.incidentType === 'physical_safety') {
          expect(row.indicator).toBe('red');
        } else {
          expect(row.indicator).toBe('default');
        }
      }),
      { numRuns: 100 }
    );
  });
});
