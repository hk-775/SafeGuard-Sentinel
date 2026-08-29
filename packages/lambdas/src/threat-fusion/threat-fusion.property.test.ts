// Feature: safeguard-sentinel, Property 16: Network Disruption Requires Correlated Accounts

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { fuseSignals } from './handler';
import type { ThreatFusionDeps } from './types';
import type { AnalyzerOutputEvent, CompositeThreatScoreRecord } from '@safeguard-sentinel/shared';
import {
  InterventionLevel,
  INTERVENTION_THRESHOLDS,
  NETWORK_DISRUPTION_MIN_ACCOUNTS,
} from '@safeguard-sentinel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnalyzerEvent(
  overrides: Partial<AnalyzerOutputEvent> = {},
): AnalyzerOutputEvent {
  return {
    analyzerId: 'visual',
    sessionId: 'session-1',
    userId: 'user-1',
    score: 50,
    confidence: 0.8,
    signals: [],
    metadata: {},
    ...overrides,
  };
}

function makeDeps(overrides: {
  existingRecord?: CompositeThreatScoreRecord | null;
  correlatedAccounts?: string[];
} = {}): ThreatFusionDeps {
  return {
    sessionStateStore: {
      getScoreRecord: vi.fn().mockResolvedValue(overrides.existingRecord ?? null),
      putScoreRecord: vi.fn().mockResolvedValue(undefined),
    },
    neptune: {
      findCorrelatedAccounts: vi.fn().mockResolvedValue(overrides.correlatedAccounts ?? []),
    },
    eventBridge: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * Builds an existing CompositeThreatScoreRecord with weights that produce
 * a predictable composite score when the incoming analyzer event is applied.
 *
 * Strategy: set all four domain scores to the same value and use equal weights
 * that sum to 1.0 so the composite equals that value exactly.
 */
function buildExistingRecordForScore(targetScore: number): CompositeThreatScoreRecord {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    compositeScore: targetScore,
    visualScore: targetScore,
    textualScore: targetScore,
    behavioralScore: targetScore,
    temporalScore: targetScore,
    weights: { visual: 0.25, textual: 0.25, behavioral: 0.25, temporal: 0.25 },
    degraded: false,
    degradedAnalyzers: [],
    activeInterventionLevel: InterventionLevel.None,
    lastUpdated: new Date().toISOString(),
    ttl: 0,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a composite score in [94, 100] (Level 4 eligible range). */
const arbScoreLevel4 = fc.integer({ min: INTERVENTION_THRESHOLDS.LEVEL_4, max: 100 });

/** Generates a composite score in [0, 93] (below Level 4 threshold). */
const arbScoreBelowLevel4 = fc.integer({ min: 0, max: INTERVENTION_THRESHOLDS.LEVEL_4 - 1 });

/** Generates a list of correlated account IDs with length >= NETWORK_DISRUPTION_MIN_ACCOUNTS. */
const arbEnoughAccounts = fc
  .integer({ min: NETWORK_DISRUPTION_MIN_ACCOUNTS, max: 10 })
  .chain((count) =>
    fc.array(
      fc.stringMatching(/^acc-[a-z0-9]{1,12}$/),
      { minLength: count, maxLength: count },
    ),
  );

/** Generates a list of correlated account IDs with length < NETWORK_DISRUPTION_MIN_ACCOUNTS (0, 1, or 2). */
const arbTooFewAccounts = fc
  .integer({ min: 0, max: NETWORK_DISRUPTION_MIN_ACCOUNTS - 1 })
  .chain((count) =>
    fc.array(
      fc.stringMatching(/^acc-[a-z0-9]{1,12}$/),
      { minLength: count, maxLength: count },
    ),
  );

// ---------------------------------------------------------------------------
// Property 16: Network Disruption Requires Correlated Accounts
// ---------------------------------------------------------------------------

describe('Property 16: Network Disruption Requires Correlated Accounts', () => {
  // **Validates: Requirements 9.1, 10.2**

  it('score >= 94 with 3+ correlated accounts → Level 4 (NetworkDisruption)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbScoreLevel4,
        arbEnoughAccounts,
        async (targetScore, correlatedAccounts) => {
          const existing = buildExistingRecordForScore(targetScore);
          const deps = makeDeps({ existingRecord: existing, correlatedAccounts });

          // Send an event for the same target score so composite stays at targetScore
          const result = await fuseSignals(
            makeAnalyzerEvent({ analyzerId: 'visual', score: targetScore }),
            deps,
          );

          expect(result.compositeScore).toBeGreaterThanOrEqual(INTERVENTION_THRESHOLDS.LEVEL_4);
          expect(result.activeInterventionLevel).toBe(InterventionLevel.NetworkDisruption);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('score >= 94 with fewer than 3 correlated accounts → Level 3 (InteractionRestriction)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbScoreLevel4,
        arbTooFewAccounts,
        async (targetScore, correlatedAccounts) => {
          const existing = buildExistingRecordForScore(targetScore);
          const deps = makeDeps({ existingRecord: existing, correlatedAccounts });

          const result = await fuseSignals(
            makeAnalyzerEvent({ analyzerId: 'visual', score: targetScore }),
            deps,
          );

          expect(result.compositeScore).toBeGreaterThanOrEqual(INTERVENTION_THRESHOLDS.LEVEL_4);
          expect(result.activeInterventionLevel).toBe(InterventionLevel.InteractionRestriction);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('score < 94 never produces Level 4 regardless of correlated accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbScoreBelowLevel4,
        arbEnoughAccounts,
        async (targetScore, correlatedAccounts) => {
          const existing = buildExistingRecordForScore(targetScore);
          const deps = makeDeps({ existingRecord: existing, correlatedAccounts });

          const result = await fuseSignals(
            makeAnalyzerEvent({ analyzerId: 'visual', score: targetScore }),
            deps,
          );

          expect(result.compositeScore).toBeLessThan(INTERVENTION_THRESHOLDS.LEVEL_4);
          expect(result.activeInterventionLevel).not.toBe(InterventionLevel.NetworkDisruption);
        },
      ),
      { numRuns: 100 },
    );
  });
});
