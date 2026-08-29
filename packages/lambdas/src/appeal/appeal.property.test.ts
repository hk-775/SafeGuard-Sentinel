// Feature: safeguard-sentinel, Property 24: Appeal Lifecycle Integrity

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import {
  AppealStatus,
  APPEAL_RESOLUTION_SLA_HOURS,
} from '@safeguard-sentinel/shared';
import { submitAppeal } from './submit-appeal';
import type { SubmitAppealDeps, SubmitAppealRequest } from './types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbSubmitAppealRequest: fc.Arbitrary<SubmitAppealRequest> = fc.record({
  userId: fc.uuid(),
  interventionId: fc.uuid(),
  originalEvidencePackageId: fc.uuid(),
});

// ---------------------------------------------------------------------------
// Helper: build mock deps that capture calls
// ---------------------------------------------------------------------------

function makeMockDeps() {
  const createAppealCalls: unknown[] = [];
  const routeAppealCalls: unknown[] = [];

  const deps: SubmitAppealDeps = {
    appealStore: {
      createAppeal: vi.fn().mockImplementation(async (appeal) => {
        createAppealCalls.push(appeal);
      }),
      getAppeal: vi.fn().mockResolvedValue(null),
      updateAppeal: vi.fn().mockResolvedValue(undefined),
    },
    escalationClient: {
      routeAppeal: vi.fn().mockImplementation(async (params) => {
        routeAppealCalls.push(params);
      }),
    },
  };

  return { deps, createAppealCalls, routeAppealCalls };
}

// ---------------------------------------------------------------------------
// Property 24: Appeal Lifecycle Integrity
// ---------------------------------------------------------------------------

describe('Property 24: Appeal Lifecycle Integrity', () => {
  // **Validates: Requirements 20.1, 20.2, 20.3**

  it('acknowledgment is always generated with a valid ISO-8601 timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(arbSubmitAppealRequest, async (request) => {
        const { deps } = makeMockDeps();

        const result = await submitAppeal(request, deps);

        // acknowledgedAt must be a valid ISO-8601 string
        expect(result.acknowledgedAt).toBeDefined();
        const parsed = new Date(result.acknowledgedAt);
        expect(parsed.toISOString()).toBe(result.acknowledgedAt);
        expect(isNaN(parsed.getTime())).toBe(false);

        // status must be Acknowledged
        expect(result.status).toBe(AppealStatus.Acknowledged);
      }),
      { numRuns: 100 },
    );
  });

  it('escalation client is always called with correct appeal context', async () => {
    await fc.assert(
      fc.asyncProperty(arbSubmitAppealRequest, async (request) => {
        const { deps, routeAppealCalls } = makeMockDeps();

        const result = await submitAppeal(request, deps);

        // Escalation client must be called exactly once
        expect(routeAppealCalls.length).toBe(1);

        const routeParams = routeAppealCalls[0] as {
          appealId: string;
          userId: string;
          interventionId: string;
          evidencePackageId: string;
        };

        // Must include the appeal ID, user, intervention, and evidence package
        expect(routeParams.appealId).toBe(result.appealId);
        expect(routeParams.userId).toBe(request.userId);
        expect(routeParams.interventionId).toBe(request.interventionId);
        expect(routeParams.evidencePackageId).toBe(request.originalEvidencePackageId);
      }),
      { numRuns: 100 },
    );
  });

  it('SLA deadline is always exactly 24 hours from acknowledgedAt', async () => {
    await fc.assert(
      fc.asyncProperty(arbSubmitAppealRequest, async (request) => {
        const { deps } = makeMockDeps();

        const result = await submitAppeal(request, deps);

        const acknowledgedMs = new Date(result.acknowledgedAt).getTime();
        const slaMs = new Date(result.slaDeadline).getTime();
        const expectedDiffMs = APPEAL_RESOLUTION_SLA_HOURS * 60 * 60 * 1000;

        expect(slaMs - acknowledgedMs).toBe(expectedDiffMs);
      }),
      { numRuns: 100 },
    );
  });
});
