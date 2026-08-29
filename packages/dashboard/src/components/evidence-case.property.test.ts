import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatEvidenceCase } from './EvidenceCaseView';
import type { EvidencePackage, Signal } from '../types';
import { InterventionLevel, SignalSeverity } from '../types';

// Feature: safeguard-dashboard, Property 14: Evidence case viewer renders all package fields and signal breakdown
// **Validates: Requirements 9.1, 9.2**

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

const signalArb: fc.Arbitrary<Signal> = fc.record({
  signalType: fc.string({ minLength: 1, maxLength: 20 }),
  severity: fc.constantFrom(SignalSeverity.Low, SignalSeverity.Medium, SignalSeverity.High, SignalSeverity.Critical),
  details: fc.constant({} as Record<string, unknown>),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
});

const signalDomainArb = fc.record({
  score: fc.double({ min: 0, max: 100, noNaN: true }),
  signals: fc.array(signalArb, { minLength: 0, maxLength: 3 }),
});

const chainOfCustodyArb = fc.record({
  createdBy: fc.string({ minLength: 1, maxLength: 30 }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  checksumSHA256: fc.hexaString({ minLength: 64, maxLength: 64 }),
  s3ObjectLockRetainUntil: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
});

const evidencePackageArb: fc.Arbitrary<EvidencePackage> = fc.record({
  packageId: fc.uuid(),
  caseId: fc.uuid(),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) => d.toISOString()),
  targetAccounts: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  interventionLevel: interventionLevelArb,
  compositeScoreAtIntervention: fc.integer({ min: 0, max: 100 }),
  signalBreakdown: fc.record({
    visual: signalDomainArb,
    textual: signalDomainArb,
    behavioral: signalDomainArb,
    temporal: signalDomainArb,
  }),
  conversationHistory: fc.constant([]),
  photoMetadata: fc.constant([]),
  behavioralTimeline: fc.constant([]),
  crossReferences: fc.constant([]),
  networkGraph: fc.record({
    nodes: fc.array(fc.constant({} as Record<string, unknown>), { minLength: 0, maxLength: 10 }),
    edges: fc.array(fc.constant({} as Record<string, unknown>), { minLength: 0, maxLength: 10 }),
  }),
  chainOfCustody: chainOfCustodyArb,
  aiResponseDrafts: fc.constant([]),
});

describe('EvidenceCaseView formatEvidenceCase property tests', () => {
  it('should include packageId from the input', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.packageId).toBe(pkg.packageId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include caseId from the input', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.caseId).toBe(pkg.caseId);
      }),
      { numRuns: 100 }
    );
  });

  it('should include createdAt from the input', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.createdAt).toBe(pkg.createdAt);
      }),
      { numRuns: 100 }
    );
  });

  it('should include targetAccounts from the input', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.targetAccounts).toEqual(pkg.targetAccounts);
      }),
      { numRuns: 100 }
    );
  });

  it('should include interventionLevel as a human-readable name', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.interventionLevel).toBe(INTERVENTION_LEVEL_NAMES[pkg.interventionLevel]);
      }),
      { numRuns: 100 }
    );
  });

  it('should include compositeScoreAtIntervention from the input', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.compositeScoreAtIntervention).toBe(pkg.compositeScoreAtIntervention);
      }),
      { numRuns: 100 }
    );
  });

  it('should include chain of custody fields', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.chainOfCustody.createdBy).toBe(pkg.chainOfCustody.createdBy);
        expect(result.chainOfCustody.createdAt).toBe(pkg.chainOfCustody.createdAt);
        expect(result.chainOfCustody.checksumSHA256).toBe(pkg.chainOfCustody.checksumSHA256);
        expect(result.chainOfCustody.retainUntil).toBe(pkg.chainOfCustody.s3ObjectLockRetainUntil);
      }),
      { numRuns: 100 }
    );
  });

  it('should include all four signal domain scores and signals', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.signalBreakdown).toHaveLength(4);
        const domains = result.signalBreakdown.map((d) => d.domain);
        expect(domains).toEqual(['visual', 'textual', 'behavioral', 'temporal']);
        expect(result.signalBreakdown[0].score).toBe(pkg.signalBreakdown.visual.score);
        expect(result.signalBreakdown[0].signals).toEqual(pkg.signalBreakdown.visual.signals);
        expect(result.signalBreakdown[1].score).toBe(pkg.signalBreakdown.textual.score);
        expect(result.signalBreakdown[1].signals).toEqual(pkg.signalBreakdown.textual.signals);
        expect(result.signalBreakdown[2].score).toBe(pkg.signalBreakdown.behavioral.score);
        expect(result.signalBreakdown[2].signals).toEqual(pkg.signalBreakdown.behavioral.signals);
        expect(result.signalBreakdown[3].score).toBe(pkg.signalBreakdown.temporal.score);
        expect(result.signalBreakdown[3].signals).toEqual(pkg.signalBreakdown.temporal.signals);
      }),
      { numRuns: 100 }
    );
  });

  it('should include network graph node and edge counts', () => {
    fc.assert(
      fc.property(evidencePackageArb, (pkg) => {
        const result = formatEvidenceCase(pkg);
        expect(result.networkGraphNodeCount).toBe(pkg.networkGraph.nodes.length);
        expect(result.networkGraphEdgeCount).toBe(pkg.networkGraph.edges.length);
      }),
      { numRuns: 100 }
    );
  });
});
