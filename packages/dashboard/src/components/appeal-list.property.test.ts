import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatAppealRow } from './AppealList';
import { getAppealSlaStatus } from '../utils/appeal-sla';
import type { AppealRecord } from '../types';
import { AppealStatus, AppealResolution } from '../types';

// Feature: safeguard-dashboard, Property 13: Appeal record rendering includes all required columns
// **Validates: Requirements 8.1**

const appealStatusArb = fc.constantFrom(
  AppealStatus.Submitted,
  AppealStatus.Acknowledged,
  AppealStatus.InReview,
  AppealStatus.Resolved
);

const appealResolutionArb = fc.option(
  fc.constantFrom(
    AppealResolution.Upheld,
    AppealResolution.Reversed,
    AppealResolution.Modified
  ),
  { nil: null }
);

const appealRecordArb: fc.Arbitrary<AppealRecord> = fc.record({
  appealId: fc.uuid(),
  userId: fc.uuid(),
  interventionId: fc.uuid(),
  submittedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  acknowledgedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  status: appealStatusArb,
  resolution: appealResolutionArb,
  resolvedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()), { nil: null }),
  resolvedBy: fc.option(fc.uuid(), { nil: null }),
  originalEvidencePackageId: fc.uuid(),
  slaDeadline: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  ttl: fc.integer({ min: 0, max: 2000000000 }),
});

describe('AppealList formatAppealRow property tests', () => {
  it('should include appealId from the input', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        expect(row.appealId).toBe(appeal.appealId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include userId from the input', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        expect(row.userId).toBe(appeal.userId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include interventionId from the input', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        expect(row.interventionId).toBe(appeal.interventionId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include submittedAt from the input', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        expect(row.submittedAt).toBe(appeal.submittedAt);
      }),
      { numRuns: 100 }
    );
  });

  it('should include acknowledgedAt from the input', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        expect(row.acknowledgedAt).toBe(appeal.acknowledgedAt);
      }),
      { numRuns: 100 }
    );
  });

  it('should include status from the input', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        expect(row.status).toBe(appeal.status);
      }),
      { numRuns: 100 }
    );
  });

  it('should include resolution or N/A when null', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        if (appeal.resolution !== null) {
          expect(row.resolution).toBe(appeal.resolution);
        } else {
          expect(row.resolution).toBe('N/A');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include slaDeadline from the input', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const row = formatAppealRow(appeal, new Date());
        expect(row.slaDeadline).toBe(appeal.slaDeadline);
      }),
      { numRuns: 100 }
    );
  });

  it('should compute slaIndicator using getAppealSlaStatus', () => {
    fc.assert(
      fc.property(appealRecordArb, (appeal) => {
        const now = new Date();
        const row = formatAppealRow(appeal, now);
        expect(row.slaIndicator).toBe(getAppealSlaStatus(appeal.slaDeadline, now));
      }),
      { numRuns: 100 }
    );
  });
});
