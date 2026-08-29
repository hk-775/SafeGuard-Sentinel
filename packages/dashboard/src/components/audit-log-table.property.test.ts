import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatAuditLogRow } from './AuditLogTable';
import type { AuditLogEntry } from '../types';
import { InterventionLevel } from '../types';

// Feature: safeguard-dashboard, Property 12: Audit log entry rendering includes all required columns
// **Validates: Requirements 7.4**

const interventionLevelArb = fc.constantFrom(
  InterventionLevel.None,
  InterventionLevel.SafetyPrompt,
  InterventionLevel.Friction,
  InterventionLevel.InteractionRestriction,
  InterventionLevel.NetworkDisruption
);

const INTERVENTION_LEVEL_NAMES: Record<InterventionLevel, string> = {
  [InterventionLevel.None]: 'None',
  [InterventionLevel.SafetyPrompt]: 'SafetyPrompt',
  [InterventionLevel.Friction]: 'Friction',
  [InterventionLevel.InteractionRestriction]: 'Interaction Restriction',
  [InterventionLevel.NetworkDisruption]: 'NetworkDisruption',
};

const auditLogEntryArb: fc.Arbitrary<AuditLogEntry> = fc.record({
  interventionId: fc.uuid(),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  interventionLevel: interventionLevelArb,
  interventionType: fc.string({ minLength: 1, maxLength: 30 }),
  targetAccounts: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  triggeringScore: fc.integer({ min: 0, max: 100 }),
  actionTaken: fc.string({ minLength: 1, maxLength: 50 }),
  outcome: fc.string({ minLength: 1, maxLength: 30 }),
  humanReviewRequired: fc.boolean(),
});

describe('AuditLogTable formatAuditLogRow property tests', () => {
  it('should include interventionId from the input', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.interventionId).toBe(entry.interventionId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include timestamp from the input', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.timestamp).toBe(entry.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  it('should include interventionLevel as a human-readable name', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.interventionLevel).toBe(INTERVENTION_LEVEL_NAMES[entry.interventionLevel]);
      }),
      { numRuns: 100 }
    );
  });

  it('should include interventionType from the input', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.interventionType).toBe(entry.interventionType);
      }),
      { numRuns: 100 }
    );
  });

  it('should include targetAccounts as a comma-separated string', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.targetAccounts).toBe(entry.targetAccounts.join(', '));
      }),
      { numRuns: 100 }
    );
  });

  it('should include triggeringScore from the input', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.triggeringScore).toBe(entry.triggeringScore);
      }),
      { numRuns: 100 }
    );
  });

  it('should include actionTaken from the input', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.actionTaken).toBe(entry.actionTaken);
      }),
      { numRuns: 100 }
    );
  });

  it('should include outcome from the input', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.outcome).toBe(entry.outcome);
      }),
      { numRuns: 100 }
    );
  });

  it('should include humanReviewRequired from the input', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const row = formatAuditLogRow(entry);
        expect(row.humanReviewRequired).toBe(entry.humanReviewRequired);
      }),
      { numRuns: 100 }
    );
  });
});
