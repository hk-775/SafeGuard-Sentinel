// Feature: safeguard-sentinel, Property 21: Intervention Logging Completeness

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import {
  InterventionLevel,
  InterventionType,
  InterventionOutcome,
} from '@safeguard-sentinel/shared';
import { logIntervention } from './log-intervention';
import type { AuditLogEntry, LogInterventionDeps } from './types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbInterventionLevel = fc.constantFrom(
  InterventionLevel.SafetyPrompt,
  InterventionLevel.Friction,
  InterventionLevel.InteractionRestriction,
  InterventionLevel.NetworkDisruption,
);

const arbInterventionType = fc.constantFrom(
  InterventionType.SafetyPrompt,
  InterventionType.Friction,
  InterventionType.InteractionRestriction,
  InterventionType.NetworkDisruption,
);

const arbOutcome = fc.constantFrom(
  InterventionOutcome.Pending,
  InterventionOutcome.Resolved,
  InterventionOutcome.Appealed,
  InterventionOutcome.Reversed,
);

const arbScore = fc.integer({ min: 0, max: 100 });

const arbSignalBreakdown = fc.record({
  visual: arbScore,
  textual: arbScore,
  behavioral: arbScore,
  temporal: arbScore,
});

const arbTargetAccounts = fc.array(fc.uuid(), { minLength: 1, maxLength: 10 });

const arbTimestamp = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
  .map((d) => d.toISOString());

const arbAuditLogEntry: fc.Arbitrary<AuditLogEntry> = fc.record({
  interventionId: fc.uuid(),
  timestamp: arbTimestamp,
  interventionLevel: arbInterventionLevel,
  interventionType: arbInterventionType,
  targetAccounts: arbTargetAccounts,
  triggeringScore: arbScore,
  signalBreakdown: arbSignalBreakdown,
  actionTaken: fc.string({ minLength: 1, maxLength: 100 }),
  outcome: arbOutcome,
  humanReviewRequired: fc.boolean(),
  escalationQueueId: fc.option(fc.uuid(), { nil: null }),
});

// ---------------------------------------------------------------------------
// Helper: build mock deps that capture the indexed body
// ---------------------------------------------------------------------------

function makeMockDeps(): LogInterventionDeps & { getCapturedBody: () => Record<string, unknown> | undefined } {
  let capturedBody: Record<string, unknown> | undefined;
  return {
    openSearchClient: {
      index: vi.fn().mockImplementation(async (params: { body: Record<string, unknown> }) => {
        capturedBody = params.body;
      }),
    },
    indexName: 'audit-interventions',
    getCapturedBody: () => capturedBody,
  };
}

// ---------------------------------------------------------------------------
// Property 21: Intervention Logging Completeness
// ---------------------------------------------------------------------------

describe('Property 21: Intervention Logging Completeness', () => {
  // **Validates: Requirements 18.1**

  it('log entry always contains triggering score, all four domain scores, intervention type, target accounts, timestamp, and intervention level', async () => {
    await fc.assert(
      fc.asyncProperty(arbAuditLogEntry, async (entry) => {
        const deps = makeMockDeps();

        await logIntervention(entry, deps);

        expect(deps.openSearchClient.index).toHaveBeenCalledOnce();

        const body = deps.getCapturedBody()!;

        // 1. triggeringScore is a number
        expect(typeof body.triggeringScore).toBe('number');
        expect(body.triggeringScore).toBe(entry.triggeringScore);

        // 2. signalBreakdown with all 4 domain scores
        const breakdown = body.signalBreakdown as Record<string, number>;
        expect(breakdown).toBeDefined();
        expect(typeof breakdown.visual).toBe('number');
        expect(typeof breakdown.textual).toBe('number');
        expect(typeof breakdown.behavioral).toBe('number');
        expect(typeof breakdown.temporal).toBe('number');

        // 3. interventionType is a valid enum value
        const validTypes = Object.values(InterventionType);
        expect(validTypes).toContain(body.interventionType);

        // 4. targetAccounts is a non-empty array of strings
        const accounts = body.targetAccounts as string[];
        expect(Array.isArray(accounts)).toBe(true);
        expect(accounts.length).toBeGreaterThan(0);
        accounts.forEach((acc) => expect(typeof acc).toBe('string'));

        // 5. timestamp is a string
        expect(typeof body.timestamp).toBe('string');
        expect((body.timestamp as string).length).toBeGreaterThan(0);

        // 6. interventionLevel is a valid enum value
        const validLevels = [
          InterventionLevel.SafetyPrompt,
          InterventionLevel.Friction,
          InterventionLevel.InteractionRestriction,
          InterventionLevel.NetworkDisruption,
        ];
        expect(validLevels).toContain(body.interventionLevel);
      }),
      { numRuns: 100 },
    );
  });
});
