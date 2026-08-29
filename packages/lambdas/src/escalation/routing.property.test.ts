// Feature: safeguard-sentinel, Property 20: Human Escalation Routing Logic

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { shouldEscalate } from './routing';
import type { EscalationCase } from './types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary composite score in [0, 100]. */
const arbScore = fc.float({ min: 0, max: 100, noNaN: true });

/** Arbitrary escalation case with randomised fields. */
const arbEscalationCase = fc.record({
  caseId: fc.uuid(),
  sessionId: fc.uuid(),
  userId: fc.uuid(),
  compositeScore: arbScore,
  isSerious: fc.boolean(),
  isAppeal: fc.boolean(),
  hasLegalImplications: fc.boolean(),
  evidencePackageId: fc.uuid(),
});

/** Score strictly inside the edge-case band (70, 88). */
const arbEdgeCaseScore = fc.float({ min: 70, max: 88, minExcluded: true, maxExcluded: true, noNaN: true });

/** Score outside the edge-case band: [0, 70] ∪ [88, 100]. */
const arbNonEdgeCaseScore = fc.oneof(
  fc.float({ min: 0, max: 70, noNaN: true }),
  fc.float({ min: 88, max: 100, noNaN: true }),
);

// ---------------------------------------------------------------------------
// Property 20: Human Escalation Routing Logic
// **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
// ---------------------------------------------------------------------------

describe('Property 20: Human Escalation Routing Logic', () => {
  it('serious incident reports are always routed regardless of score', () => {
    fc.assert(
      fc.property(arbScore, fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(), fc.boolean(), fc.boolean(),
        (score, caseId, sessionId, userId, evidencePackageId, isAppeal, hasLegal) => {
          const c: EscalationCase = {
            caseId,
            sessionId,
            userId,
            compositeScore: score,
            isSerious: true,
            isAppeal,
            hasLegalImplications: hasLegal,
            evidencePackageId,
          };
          const result = shouldEscalate(c);
          expect(result.shouldRoute).toBe(true);
          expect(result.flags).toContain('serious-incident');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('appeal submissions are always routed', () => {
    fc.assert(
      fc.property(arbScore, fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(), fc.boolean(), fc.boolean(),
        (score, caseId, sessionId, userId, evidencePackageId, isSerious, hasLegal) => {
          const c: EscalationCase = {
            caseId,
            sessionId,
            userId,
            compositeScore: score,
            isSerious,
            isAppeal: true,
            hasLegalImplications: hasLegal,
            evidencePackageId,
          };
          const result = shouldEscalate(c);
          expect(result.shouldRoute).toBe(true);
          expect(result.flags).toContain('appeal');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('edge-case scores (70 < score < 88) are routed', () => {
    fc.assert(
      fc.property(arbEdgeCaseScore, fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(),
        (score, caseId, sessionId, userId, evidencePackageId) => {
          const c: EscalationCase = {
            caseId,
            sessionId,
            userId,
            compositeScore: score,
            isSerious: false,
            isAppeal: false,
            hasLegalImplications: false,
            evidencePackageId,
          };
          const result = shouldEscalate(c);
          expect(result.shouldRoute).toBe(true);
          expect(result.flags).toContain('edge-case');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('scores outside edge-case band without other criteria are NOT routed', () => {
    fc.assert(
      fc.property(arbNonEdgeCaseScore, fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(),
        (score, caseId, sessionId, userId, evidencePackageId) => {
          const c: EscalationCase = {
            caseId,
            sessionId,
            userId,
            compositeScore: score,
            isSerious: false,
            isAppeal: false,
            hasLegalImplications: false,
            evidencePackageId,
          };
          const result = shouldEscalate(c);
          expect(result.shouldRoute).toBe(false);
          expect(result.flags).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('legal cases include legal-review flag', () => {
    fc.assert(
      fc.property(arbScore, fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(), fc.boolean(), fc.boolean(),
        (score, caseId, sessionId, userId, evidencePackageId, isSerious, isAppeal) => {
          const c: EscalationCase = {
            caseId,
            sessionId,
            userId,
            compositeScore: score,
            isSerious,
            isAppeal,
            hasLegalImplications: true,
            evidencePackageId,
          };
          const result = shouldEscalate(c);
          expect(result.shouldRoute).toBe(true);
          expect(result.flags).toContain('legal-review');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('any case meeting at least one criterion is routed', () => {
    fc.assert(
      fc.property(arbEscalationCase, (c) => {
        const result = shouldEscalate(c);
        const meetsAnyCriteria =
          c.isSerious ||
          c.isAppeal ||
          c.hasLegalImplications ||
          (c.compositeScore > 70 && c.compositeScore < 88);

        expect(result.shouldRoute).toBe(meetsAnyCriteria);
      }),
      { numRuns: 100 },
    );
  });
});
