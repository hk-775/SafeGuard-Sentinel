import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transferEvidence, TRANSFER_URL_EXPIRY_SECONDS } from './transfer-evidence';
import type { TransferEvidenceDeps } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(overrides: Partial<TransferEvidenceDeps> = {}): TransferEvidenceDeps {
  return {
    presignClient: {
      generatePresignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
    },
    accessLog: {
      logAccess: vi.fn().mockResolvedValue(undefined),
    },
    bucketName: 'evidence-bucket',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('transferEvidence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });

  it('should call presignClient.generatePresignedUrl with correct bucket, key, and expiry', async () => {
    const deps = makeDeps();

    await transferEvidence('pkg-001', 'officer-smith', 'investigation-42', deps);

    expect(deps.presignClient.generatePresignedUrl).toHaveBeenCalledWith({
      bucket: 'evidence-bucket',
      key: 'evidence/pkg-001.json',
      expiresInSeconds: 3600,
    });
  });

  it('should call accessLog.logAccess with all required fields', async () => {
    const deps = makeDeps();

    await transferEvidence('pkg-001', 'officer-smith', 'investigation-42', deps);

    expect(deps.accessLog.logAccess).toHaveBeenCalledWith({
      packageId: 'pkg-001',
      requestedBy: 'officer-smith',
      purpose: 'investigation-42',
      presignedUrl: 'https://s3.example.com/presigned-url',
      expiresAt: '2024-06-15T11:00:00.000Z',
      timestamp: '2024-06-15T10:00:00.000Z',
    });
  });

  it('should return presignedUrl and expiresAt matching expected values', async () => {
    const deps = makeDeps();

    const result = await transferEvidence('pkg-001', 'officer-smith', 'investigation-42', deps);

    expect(result).toEqual({
      presignedUrl: 'https://s3.example.com/presigned-url',
      expiresAt: '2024-06-15T11:00:00.000Z',
    });
  });

  it('should use the evidence/{packageId}.json key pattern', async () => {
    const deps = makeDeps();

    await transferEvidence('my-unique-pkg', 'agent-jones', 'case-99', deps);

    expect(deps.presignClient.generatePresignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'evidence/my-unique-pkg.json' }),
    );
  });

  it('should export TRANSFER_URL_EXPIRY_SECONDS as 3600', () => {
    expect(TRANSFER_URL_EXPIRY_SECONDS).toBe(3600);
  });
});
