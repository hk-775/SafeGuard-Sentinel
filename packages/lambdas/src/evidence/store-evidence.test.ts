import { createHash } from 'crypto';
import { describe, it, expect, vi } from 'vitest';
import { storeEvidence } from './store-evidence';
import { InterventionLevel } from '@safeguard-sentinel/shared';
import type { EvidencePackage } from '@safeguard-sentinel/shared';
import type { StoreEvidenceDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvidencePackage(overrides: Partial<EvidencePackage> = {}): EvidencePackage {
  return {
    packageId: 'pkg-abc-123',
    caseId: 'case-xyz-789',
    createdAt: '2024-06-01T12:00:00Z',
    targetAccounts: ['acc-1', 'acc-2'],
    interventionLevel: InterventionLevel.InteractionRestriction,
    compositeScoreAtIntervention: 90,
    signalBreakdown: {
      visual: { score: 80, signals: [] },
      textual: { score: 85, signals: [] },
      behavioral: { score: 70, signals: [] },
      temporal: { score: 50, signals: [] },
    },
    conversationHistory: [],
    photoMetadata: [],
    behavioralTimeline: [],
    crossReferences: [],
    networkGraph: { nodes: [], edges: [] },
    chainOfCustody: {
      createdBy: 'safeguard-sentinel-system',
      createdAt: '2024-06-01T12:00:00Z',
      checksumSHA256: 'abc123',
      s3ObjectLockRetainUntil: '2024-07-01T12:00:00Z',
    },
    aiResponseDrafts: [],
    ...overrides,
  };
}

function makeDeps(overrides: Partial<StoreEvidenceDeps> = {}): StoreEvidenceDeps {
  return {
    s3Client: { putObject: vi.fn().mockResolvedValue(undefined) },
    bucketName: 'evidence-bucket',
    kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('storeEvidence', () => {
  it('should call S3 putObject with correct parameters', async () => {
    const pkg = makeEvidencePackage();
    const deps = makeDeps();
    const body = JSON.stringify(pkg);
    const expectedChecksum = createHash('sha256').update(body).digest('hex');

    await storeEvidence(pkg, deps);

    expect(deps.s3Client.putObject).toHaveBeenCalledWith({
      bucket: 'evidence-bucket',
      key: `evidence/${pkg.packageId}.json`,
      body,
      checksumSHA256: expectedChecksum,
      sseKmsKeyId: deps.kmsKeyId,
      objectLockMode: 'COMPLIANCE',
      objectLockRetainUntilDate: pkg.chainOfCustody.s3ObjectLockRetainUntil,
    });
  });

  it('should use the evidence/{packageId}.json key pattern', async () => {
    const pkg = makeEvidencePackage({ packageId: 'my-unique-id' });
    const deps = makeDeps();

    const result = await storeEvidence(pkg, deps);

    expect(result.key).toBe('evidence/my-unique-id.json');
    expect(deps.s3Client.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'evidence/my-unique-id.json' }),
    );
  });

  it('should compute a SHA-256 checksum matching the serialized body', async () => {
    const pkg = makeEvidencePackage();
    const deps = makeDeps();
    const body = JSON.stringify(pkg);
    const expectedChecksum = createHash('sha256').update(body).digest('hex');

    await storeEvidence(pkg, deps);

    expect(deps.s3Client.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ checksumSHA256: expectedChecksum }),
    );
  });

  it('should set Object Lock mode to COMPLIANCE', async () => {
    const pkg = makeEvidencePackage();
    const deps = makeDeps();

    await storeEvidence(pkg, deps);

    expect(deps.s3Client.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ objectLockMode: 'COMPLIANCE' }),
    );
  });

  it('should return the bucket and key', async () => {
    const pkg = makeEvidencePackage();
    const deps = makeDeps();

    const result = await storeEvidence(pkg, deps);

    expect(result).toEqual({
      bucket: 'evidence-bucket',
      key: `evidence/${pkg.packageId}.json`,
    });
  });
});
