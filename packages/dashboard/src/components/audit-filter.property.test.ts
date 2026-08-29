import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildAuditFilters, type AuditFilterFormValues } from './AuditFilterBar';
import { InterventionLevel } from '../types';

// Feature: safeguard-dashboard, Property 11: Audit log filter parameters are passed through to API
// **Validates: Requirements 7.3**

const interventionLevelStringArb = fc.constantFrom('0', '1', '2', '3', '4');

const auditFilterFormArb: fc.Arbitrary<AuditFilterFormValues> = fc.record({
  dateFrom: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()), { nil: undefined }),
  dateTo: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()), { nil: undefined }),
  interventionLevel: fc.option(interventionLevelStringArb, { nil: undefined }),
  accountId: fc.option(fc.uuid(), { nil: undefined }),
  threatType: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  query: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

describe('AuditFilterBar buildAuditFilters property tests', () => {
  it('should pass through dateFrom when provided', () => {
    fc.assert(
      fc.property(auditFilterFormArb, (formValues) => {
        const result = buildAuditFilters(formValues);
        if (formValues.dateFrom) {
          expect(result.dateFrom).toBe(formValues.dateFrom);
        } else {
          expect(result.dateFrom).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should pass through dateTo when provided', () => {
    fc.assert(
      fc.property(auditFilterFormArb, (formValues) => {
        const result = buildAuditFilters(formValues);
        if (formValues.dateTo) {
          expect(result.dateTo).toBe(formValues.dateTo);
        } else {
          expect(result.dateTo).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should map interventionLevel string to InterventionLevel enum', () => {
    fc.assert(
      fc.property(auditFilterFormArb, (formValues) => {
        const result = buildAuditFilters(formValues);
        if (formValues.interventionLevel) {
          const expected = Number(formValues.interventionLevel) as InterventionLevel;
          expect(result.interventionLevel).toBe(expected);
        } else {
          expect(result.interventionLevel).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should pass through accountId when provided', () => {
    fc.assert(
      fc.property(auditFilterFormArb, (formValues) => {
        const result = buildAuditFilters(formValues);
        if (formValues.accountId) {
          expect(result.accountId).toBe(formValues.accountId);
        } else {
          expect(result.accountId).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should pass through threatType when provided', () => {
    fc.assert(
      fc.property(auditFilterFormArb, (formValues) => {
        const result = buildAuditFilters(formValues);
        if (formValues.threatType) {
          expect(result.threatType).toBe(formValues.threatType);
        } else {
          expect(result.threatType).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should pass through query (free-text search) when provided', () => {
    fc.assert(
      fc.property(auditFilterFormArb, (formValues) => {
        const result = buildAuditFilters(formValues);
        if (formValues.query) {
          expect(result.query).toBe(formValues.query);
        } else {
          expect(result.query).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});
