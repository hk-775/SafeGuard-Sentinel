// Feature: safeguard-sentinel, Property 19: Evidence Preservation Integrity for L3/L4

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { createHash } from 'crypto';
import { InterventionLevel } from '@safeguard-sentinel/shared';
import type { EvidencePackage } from '@safeguard-sentinel/shared';
import { storeEvidence } from './store-evidence';
import type { StoreEvidenceDeps } from './types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Only L3 and L4 intervention levels — the levels that require evidence preservation. */
const arbL3L4Level = fc.constantFrom(
  InterventionLevel.InteractionRestriction,
  InterventionLevel.NetworkDisruption,
);

const arbTargetAccounts = fc.array(fc.uuid(), { minLength: 1, maxLength: 5 });
const arbScore = fc.integer({ min: 0, max: 100 });

const arbRetainUntilDate = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2030-12-31'),
}).map((d) => d.toISOString());

const arbCreatedAt = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2026-12-31'),
}).map((d) => d.toISOString());

const arbEvidencePackage: fc.Arbitrary<EvidencePackage> = fc.record({
  packageId: fc.uuid(),
  caseId: fc.uuid(),
  createdAt: arbCreatedAt,
  targetAccounts: arbTargetAccounts,
  interventionLevel: arbL3L4Level,
  compositeScoreAtIntervention: arbScore,
  signalBreakdown: fc.record({
    visual: fc.record({ score: arbScore, signals: fc.constant([]) }),
    textual: fc.record({ score: arbScore, signals: fc.constant([]) }),
    behavioral: fc.record({ score: arbScore, signals: fc.constant([]) }),
    temporal: fc.record({ score: arbScore, signals: fc.constant([]) }),
  }),
  conversationHistory: fc.constant([]),
  photoMetadata: fc.constant([]),
  behavioralTimeline: fc.constant([]),
  crossReferences: fc.constant([]),
  networkGraph: fc.constant({ nodes: [], edges: [] }),
  chainOfCustody: fc.record({
    createdBy: fc.constant('safeguard-sentinel-system'),
    createdAt: arbCreatedAt,
    checksumSHA256: fc.hexaString({ minLength: 64, maxLength: 64 }),
    s3ObjectLockRetainUntil: arbRetainUntilDate,
  }),
  aiResponseDrafts: fc.constant([]),
});

// ---------------------------------------------------------------------------
// Helper: build mock deps that capture putObject calls
// ---------------------------------------------------------------------------

function makeMockDeps(): StoreEvidenceDeps & { getCalls: () => unknown[] } {
  const calls: unknown[] = [];
  return {
    s3Client: {
      putObject: vi.fn().mockImplementation(async (params: unknown) => {
        calls.push(params);
      }),
    },
    bucketName: 'evidence-bucket',
    kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
    getCalls: () => calls,
  };
}

// ---------------------------------------------------------------------------
// Property 19: Evidence Preservation Integrity for L3/L4
// ---------------------------------------------------------------------------

describe('Property 19: Evidence Preservation Integrity for L3/L4', () => {
  // **Validates: Requirements 17.1, 17.2**

  it('S3 putObject is called with COMPLIANCE Object Lock mode', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvidencePackage, async (pkg) => {
        const deps = makeMockDeps();
        await storeEvidence(pkg, deps);

        expect(deps.s3Client.putObject).toHaveBeenCalledTimes(1);
        const call = deps.getCalls()[0] as Record<string, unknown>;
        expect(call.objectLockMode).toBe('COMPLIANCE');
      }),
      { numRuns: 100 },
    );
  });

  it('stored body contains chain-of-custody metadata', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvidencePackage, async (pkg) => {
        const deps = makeMockDeps();
        await storeEvidence(pkg, deps);

        const call = deps.getCalls()[0] as Record<string, unknown>;
        const storedBody = JSON.parse(call.body as string) as EvidencePackage;

        // Chain-of-custody fields must be present
        expect(storedBody.chainOfCustody).toBeDefined();
        expect(typeof storedBody.chainOfCustody.createdBy).toBe('string');
        expect(storedBody.chainOfCustody.createdBy.length).toBeGreaterThan(0);
        expect(typeof storedBody.chainOfCustody.createdAt).toBe('string');
        expect(storedBody.chainOfCustody.createdAt.length).toBeGreaterThan(0);
        expect(typeof storedBody.chainOfCustody.checksumSHA256).toBe('string');
        expect(storedBody.chainOfCustody.checksumSHA256.length).toBeGreaterThan(0);
        expect(typeof storedBody.chainOfCustody.s3ObjectLockRetainUntil).toBe('string');
        expect(storedBody.chainOfCustody.s3ObjectLockRetainUntil.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('stored body contains target account identifiers', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvidencePackage, async (pkg) => {
        const deps = makeMockDeps();
        await storeEvidence(pkg, deps);

        const call = deps.getCalls()[0] as Record<string, unknown>;
        const storedBody = JSON.parse(call.body as string) as EvidencePackage;

        expect(Array.isArray(storedBody.targetAccounts)).toBe(true);
        expect(storedBody.targetAccounts.length).toBeGreaterThan(0);
        expect(storedBody.targetAccounts).toEqual(pkg.targetAccounts);
      }),
      { numRuns: 100 },
    );
  });

  it('checksumSHA256 in putObject matches SHA-256 of the serialized body', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvidencePackage, async (pkg) => {
        const deps = makeMockDeps();
        await storeEvidence(pkg, deps);

        const call = deps.getCalls()[0] as Record<string, unknown>;
        const body = call.body as string;
        const expectedChecksum = createHash('sha256').update(body).digest('hex');

        expect(call.checksumSHA256).toBe(expectedChecksum);
      }),
      { numRuns: 100 },
    );
  });

  it('objectLockRetainUntilDate matches chain-of-custody retain-until date', async () => {
    await fc.assert(
      fc.asyncProperty(arbEvidencePackage, async (pkg) => {
        const deps = makeMockDeps();
        await storeEvidence(pkg, deps);

        const call = deps.getCalls()[0] as Record<string, unknown>;
        expect(call.objectLockRetainUntilDate).toBe(
          pkg.chainOfCustody.s3ObjectLockRetainUntil,
        );
      }),
      { numRuns: 100 },
    );
  });
});
