// Feature: safeguard-sentinel, Property 4: Intervention Level Selection

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  InterventionLevel,
  INTERVENTION_THRESHOLDS,
  NETWORK_DISRUPTION_MIN_ACCOUNTS,
} from '@safeguard-sentinel/shared';
import { selectInterventionLevel } from './handler';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Composite score in [0, 100]. */
const arbScore = fc.float({ min: 0, max: 100, noNaN: true });

/** Correlated account count in [0, 10]. */
const arbAccountCount = fc.integer({ min: 0, max: 10 });

/** Score strictly below L1 threshold (< 60). */
const arbScoreNone = fc.float({
  min: 0,
  max: INTERVENTION_THRESHOLDS.LEVEL_1,
  maxExcluded: true,
  noNaN: true,
});

/** Score in [60, 75) — Level 1 range. */
const arbScoreL1 = fc.float({
  min: INTERVENTION_THRESHOLDS.LEVEL_1,
  max: INTERVENTION_THRESHOLDS.LEVEL_2,
  maxExcluded: true,
  noNaN: true,
});

/** Score in [75, 88) — Level 2 range. */
const arbScoreL2 = fc.float({
  min: INTERVENTION_THRESHOLDS.LEVEL_2,
  max: INTERVENTION_THRESHOLDS.LEVEL_3,
  maxExcluded: true,
  noNaN: true,
});

/** Score in [88, 94) — Level 3 range. */
const arbScoreL3 = fc.float({
  min: INTERVENTION_THRESHOLDS.LEVEL_3,
  max: INTERVENTION_THRESHOLDS.LEVEL_4,
  maxExcluded: true,
  noNaN: true,
});

/** Score >= 94 — Level 4 candidate range. */
const arbScoreL4 = fc.float({
  min: INTERVENTION_THRESHOLDS.LEVEL_4,
  max: 100,
  noNaN: true,
});

/** Account count >= 3 (meets network disruption threshold). */
const arbAccountsEnough = fc.integer({
  min: NETWORK_DISRUPTION_MIN_ACCOUNTS,
  max: 10,
});

/** Account count < 3 (does not meet network disruption threshold). */
const arbAccountsTooFew = fc.integer({
  min: 0,
  max: NETWORK_DISRUPTION_MIN_ACCOUNTS - 1,
});

// ---------------------------------------------------------------------------
// Property 4: Intervention Level Selection
// ---------------------------------------------------------------------------

describe('Property 4: Intervention Level Selection', () => {
  // **Validates: Requirements 6.1, 7.1, 8.1, 9.1**

  it('score < 60 → InterventionLevel.None', () => {
    fc.assert(
      fc.property(arbScoreNone, arbAccountCount, (score, accounts) => {
        expect(selectInterventionLevel(score, accounts)).toBe(InterventionLevel.None);
      }),
      { numRuns: 100 },
    );
  });

  it('score in [60, 75) → InterventionLevel.SafetyPrompt', () => {
    fc.assert(
      fc.property(arbScoreL1, arbAccountCount, (score, accounts) => {
        expect(selectInterventionLevel(score, accounts)).toBe(InterventionLevel.SafetyPrompt);
      }),
      { numRuns: 100 },
    );
  });

  it('score in [75, 88) → InterventionLevel.Friction', () => {
    fc.assert(
      fc.property(arbScoreL2, arbAccountCount, (score, accounts) => {
        expect(selectInterventionLevel(score, accounts)).toBe(InterventionLevel.Friction);
      }),
      { numRuns: 100 },
    );
  });

  it('score in [88, 94) → InterventionLevel.InteractionRestriction', () => {
    fc.assert(
      fc.property(arbScoreL3, arbAccountCount, (score, accounts) => {
        expect(selectInterventionLevel(score, accounts)).toBe(InterventionLevel.InteractionRestriction);
      }),
      { numRuns: 100 },
    );
  });

  it('score >= 94 with >= 3 correlated accounts → InterventionLevel.NetworkDisruption', () => {
    fc.assert(
      fc.property(arbScoreL4, arbAccountsEnough, (score, accounts) => {
        expect(selectInterventionLevel(score, accounts)).toBe(InterventionLevel.NetworkDisruption);
      }),
      { numRuns: 100 },
    );
  });

  it('score >= 94 with < 3 correlated accounts → InterventionLevel.InteractionRestriction (fallback)', () => {
    fc.assert(
      fc.property(arbScoreL4, arbAccountsTooFew, (score, accounts) => {
        expect(selectInterventionLevel(score, accounts)).toBe(InterventionLevel.InteractionRestriction);
      }),
      { numRuns: 100 },
    );
  });
});
