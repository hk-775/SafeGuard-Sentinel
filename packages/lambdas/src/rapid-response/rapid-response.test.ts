import { describe, it, expect, vi } from 'vitest';
import { handleRapidResponse } from './rapid-response';
import type { IncidentReport, RapidResponseDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<IncidentReport> = {}): IncidentReport {
  return {
    reportId: 'report-1',
    sessionId: 'session-1',
    userId: 'user-1',
    targetAccounts: ['target-a', 'target-b'],
    incidentType: 'fraud',
    timestamp: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

function makeDeps(overrides: {
  packageId?: string;
  victims?: string[];
} = {}) {
  const assemblePackage = vi.fn().mockResolvedValue({
    packageId: overrides.packageId ?? 'pkg-1',
  });
  const identifyPotentialVictims = vi.fn().mockResolvedValue(
    overrides.victims ?? ['victim-1', 'victim-2'],
  );
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
// Tests
// ---------------------------------------------------------------------------

describe('handleRapidResponse', () => {
  it('assembles evidence package with correct parameters', async () => {
    const { deps, assemblePackage } = makeDeps();
    const report = makeReport();

    await handleRapidResponse(report, deps);

    expect(assemblePackage).toHaveBeenCalledOnce();
    expect(assemblePackage).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      ['target-a', 'target-b'],
    );
  });

  it('identifies potential victims from target accounts', async () => {
    const { deps, identifyPotentialVictims } = makeDeps();
    const report = makeReport({ targetAccounts: ['acc-x', 'acc-y', 'acc-z'] });

    await handleRapidResponse(report, deps);

    expect(identifyPotentialVictims).toHaveBeenCalledOnce();
    expect(identifyPotentialVictims).toHaveBeenCalledWith(['acc-x', 'acc-y', 'acc-z']);
  });

  it('initiates outreach when victims are found', async () => {
    const { deps, initiateOutreach } = makeDeps({ victims: ['v1', 'v2'] });
    const report = makeReport();

    const result = await handleRapidResponse(report, deps);

    expect(initiateOutreach).toHaveBeenCalledOnce();
    expect(initiateOutreach).toHaveBeenCalledWith(['v1', 'v2']);
    expect(result.outreachInitiated).toBe(true);
  });

  it('does NOT initiate outreach when no victims found', async () => {
    const { deps, initiateOutreach } = makeDeps({ victims: [] });
    const report = makeReport();

    const result = await handleRapidResponse(report, deps);

    expect(initiateOutreach).not.toHaveBeenCalled();
    expect(result.outreachInitiated).toBe(false);
  });

  it('routes to correct specialist for fraud incident type', async () => {
    const { deps, routeToSpecialist } = makeDeps({ packageId: 'pkg-fraud' });
    const report = makeReport({ incidentType: 'fraud' });

    const result = await handleRapidResponse(report, deps);

    expect(routeToSpecialist).toHaveBeenCalledOnce();
    expect(routeToSpecialist).toHaveBeenCalledWith({
      packageId: 'pkg-fraud',
      incidentType: 'fraud',
      sessionId: 'session-1',
      userId: 'user-1',
    });
    expect(result.routedToSpecialist).toBe('fraud');
  });

  it('routes to correct specialist for harassment incident type', async () => {
    const { deps, routeToSpecialist } = makeDeps({ packageId: 'pkg-harass' });
    const report = makeReport({ incidentType: 'harassment' });

    const result = await handleRapidResponse(report, deps);

    expect(routeToSpecialist).toHaveBeenCalledWith({
      packageId: 'pkg-harass',
      incidentType: 'harassment',
      sessionId: 'session-1',
      userId: 'user-1',
    });
    expect(result.routedToSpecialist).toBe('harassment');
  });

  it('routes to correct specialist for physical_safety incident type', async () => {
    const { deps, routeToSpecialist } = makeDeps({ packageId: 'pkg-safety' });
    const report = makeReport({ incidentType: 'physical_safety' });

    const result = await handleRapidResponse(report, deps);

    expect(routeToSpecialist).toHaveBeenCalledWith({
      packageId: 'pkg-safety',
      incidentType: 'physical_safety',
      sessionId: 'session-1',
      userId: 'user-1',
    });
    expect(result.routedToSpecialist).toBe('physical_safety');
  });

  it('returns result with all expected fields', async () => {
    const { deps } = makeDeps({ packageId: 'pkg-42', victims: ['v1', 'v2', 'v3'] });
    const report = makeReport({ incidentType: 'harassment' });

    const result = await handleRapidResponse(report, deps);

    expect(result).toEqual({
      packageId: 'pkg-42',
      victimCount: 3,
      outreachInitiated: true,
      routedToSpecialist: 'harassment',
    });
  });
});
