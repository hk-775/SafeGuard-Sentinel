// Feature: safeguard-sentinel, Property 31: Rapid Response Victim Identification
// Feature: safeguard-sentinel, Property 32: Evidence Package Routing by Incident Type

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { handleRapidResponse } from './rapid-response';
import type { IncidentReport, RapidResponseDeps } from './types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid incident types. */
const arbIncidentType = fc.constantFrom<IncidentReport['incidentType']>(
  'fraud',
  'harassment',
  'physical_safety',
);

/** Non-empty list of target account IDs. */
const arbTargetAccounts = fc.array(
  fc.stringMatching(/^[a-z0-9-]{1,20}$/),
  { minLength: 1, maxLength: 10 },
);

/** Random victim user ID list (may be empty). */
const arbVictimList = fc.array(
  fc.stringMatching(/^victim-[a-z0-9]{1,10}$/),
  { minLength: 0, maxLength: 10 },
);

/** Non-empty victim list (at least one victim). */
const arbNonEmptyVictimList = fc.array(
  fc.stringMatching(/^victim-[a-z0-9]{1,10}$/),
  { minLength: 1, maxLength: 10 },
);

/** Generate a random IncidentReport. */
const arbIncidentReport = fc.record({
  reportId: fc.stringMatching(/^report-[a-z0-9]{1,10}$/),
  sessionId: fc.stringMatching(/^session-[a-z0-9]{1,10}$/),
  userId: fc.stringMatching(/^user-[a-z0-9]{1,10}$/),
  targetAccounts: arbTargetAccounts,
  incidentType: arbIncidentType,
  timestamp: fc.date().map((d) => d.toISOString()),
}) as fc.Arbitrary<IncidentReport>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(victims: string[]) {
  const assemblePackage = vi.fn().mockResolvedValue({ packageId: 'pkg-test' });
  const identifyPotentialVictims = vi.fn().mockResolvedValue(victims);
  const initiateOutreach = vi.fn().mockResolvedValue(undefined);
  const routeToSpecialist = vi.fn().mockResolvedValue(undefined);

  const deps: RapidResponseDeps = {
    evidenceAssembly: { assemblePackage },
    victimIdentification: { identifyPotentialVictims },
    safetyOutreach: { initiateOutreach },
    specialistRouting: { routeToSpecialist },
  };

  return { deps, assemblePackage, identifyPotentialVictims, initiateOutreach, routeToSpecialist };
}

// ---------------------------------------------------------------------------
// Property 31: Rapid Response Victim Identification
// ---------------------------------------------------------------------------

describe('Property 31: Rapid Response Victim Identification', () => {
  // **Validates: Requirements 12.3, 12.4**

  it('identifyPotentialVictims is always called with the report targetAccounts', async () => {
    await fc.assert(
      fc.asyncProperty(arbIncidentReport, arbVictimList, async (report, victims) => {
        const { deps, identifyPotentialVictims } = makeDeps(victims);

        await handleRapidResponse(report, deps);

        expect(identifyPotentialVictims).toHaveBeenCalledOnce();
        expect(identifyPotentialVictims).toHaveBeenCalledWith(report.targetAccounts);
      }),
      { numRuns: 100 },
    );
  });

  it('initiateOutreach is called with victims when victims are found', async () => {
    await fc.assert(
      fc.asyncProperty(arbIncidentReport, arbNonEmptyVictimList, async (report, victims) => {
        const { deps, initiateOutreach } = makeDeps(victims);

        await handleRapidResponse(report, deps);

        expect(initiateOutreach).toHaveBeenCalledOnce();
        expect(initiateOutreach).toHaveBeenCalledWith(victims);
      }),
      { numRuns: 100 },
    );
  });

  it('initiateOutreach is NOT called when no victims found', async () => {
    await fc.assert(
      fc.asyncProperty(arbIncidentReport, async (report) => {
        const { deps, initiateOutreach } = makeDeps([]);

        await handleRapidResponse(report, deps);

        expect(initiateOutreach).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it('outreachInitiated in result matches whether victims were found', async () => {
    await fc.assert(
      fc.asyncProperty(arbIncidentReport, arbVictimList, async (report, victims) => {
        const { deps } = makeDeps(victims);

        const result = await handleRapidResponse(report, deps);

        expect(result.outreachInitiated).toBe(victims.length > 0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 32: Evidence Package Routing by Incident Type
// ---------------------------------------------------------------------------

describe('Property 32: Evidence Package Routing by Incident Type', () => {
  // **Validates: Requirements 12.5**

  it('routeToSpecialist is called with the correct incidentType', async () => {
    await fc.assert(
      fc.asyncProperty(arbIncidentReport, arbVictimList, async (report, victims) => {
        const { deps, routeToSpecialist } = makeDeps(victims);

        await handleRapidResponse(report, deps);

        expect(routeToSpecialist).toHaveBeenCalledOnce();
        expect(routeToSpecialist).toHaveBeenCalledWith(
          expect.objectContaining({ incidentType: report.incidentType }),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('result.routedToSpecialist matches the report incidentType', async () => {
    await fc.assert(
      fc.asyncProperty(arbIncidentReport, arbVictimList, async (report, victims) => {
        const { deps } = makeDeps(victims);

        const result = await handleRapidResponse(report, deps);

        expect(result.routedToSpecialist).toBe(report.incidentType);
      }),
      { numRuns: 100 },
    );
  });
});
